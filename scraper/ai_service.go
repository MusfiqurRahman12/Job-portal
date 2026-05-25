package scraper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type AIService struct {
	apiKey      string
	lastRequest time.Time
	mu          sync.Mutex
}

func NewAIService(apiKey string) *AIService {
	return &AIService{apiKey: apiKey}
}

// callGemini handles rate-limiting and robust retries with backoff for the Gemini API
func (ai *AIService) callGemini(prompt string, generationConfig map[string]interface{}) ([]byte, error) {
	ai.mu.Lock()
	// Enforce 12 seconds spacing between requests to safely stay within the 5 RPM free tier limit
	elapsed := time.Since(ai.lastRequest)
	if elapsed < 12*time.Second {
		sleepDur := 12*time.Second - elapsed
		log.Printf("[AI] Rate limiting: spacing requests. Sleeping for %v...", sleepDur)
		time.Sleep(sleepDur)
	}
	ai.lastRequest = time.Now()
	ai.mu.Unlock()

	reqBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": generationConfig,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to encode gemini request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", ai.apiKey)

	var respBody []byte
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			return nil, fmt.Errorf("failed to create gemini request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 35 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("failed to call gemini api: %w", err)
			time.Sleep(5 * time.Second)
			continue
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = fmt.Errorf("failed to read gemini response body: %w", err)
			continue
		}

		if resp.StatusCode != 200 {
			lastErr = fmt.Errorf("gemini API error: %d - %s", resp.StatusCode, string(body))
			if resp.StatusCode == 429 || resp.StatusCode == 503 {
				backoff := time.Duration(attempt*15) * time.Second
				log.Printf("[AI] Received status %d. Retrying attempt %d/3 in %v...", resp.StatusCode, attempt, backoff)
				time.Sleep(backoff)
				continue
			}
			return nil, lastErr
		}

		respBody = body
		break
	}

	if len(respBody) == 0 && lastErr != nil {
		return nil, lastErr
	}

	return respBody, nil
}

// OptimizeJob content for SEO using AI
func (ai *AIService) OptimizeJob(job *shared.Job) error {
	if ai.apiKey == "" {
		return nil // Skip if no API key
	}

	log.Printf("[AI] Optimizing description for: %s", job.Title)

	prompt := fmt.Sprintf(`You are a professional HR Specialist and recruiter at a top-tier company.
Rewrite the following job posting to be highly engaging, well-structured, professional, and SEO-optimized.
Use bullet points for requirements and responsibilities. Keep the tone warm yet authoritative.
Preserve all factual details (salary, location, company name, technical requirements) exactly as stated.
Format with clear sections using markdown:
- **About the Role** — A compelling 2-3 sentence overview
- **Responsibilities** — Bullet-pointed key duties
- **Requirements** — Bullet-pointed must-have qualifications
- **Nice to Have** — Optional qualifications (only if mentioned in original)
- **Benefits** — Perks and compensation details (only if mentioned in original)
- **How to Apply** — Application instructions (only if mentioned in original)

Do NOT invent any details not present in the original. Keep it concise and professional.
Do NOT wrap the output in markdown backticks.

Original Job Description:
%s`, job.Description)

	genConfig := map[string]interface{}{
		"temperature": 0.7,
	}

	body, err := ai.callGemini(prompt, genConfig)
	if err != nil {
		return err
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		newDesc := geminiResp.Candidates[0].Content.Parts[0].Text
		newDesc = strings.TrimSpace(newDesc)
		newDesc = strings.TrimPrefix(newDesc, "```markdown")
		newDesc = strings.TrimPrefix(newDesc, "```")
		newDesc = strings.TrimSuffix(newDesc, "```")
		job.Description = strings.TrimSpace(newDesc)
		log.Printf("[AI] Successfully optimized: %s", job.Title)
	}

	return nil
}

// OptimizeNews rewrites raw news snippets into engaging remote work blog posts using AI
func (ai *AIService) OptimizeNews(art *shared.News) error {
	if ai.apiKey == "" {
		return nil // Skip if no API key
	}

	log.Printf("[AI] Optimizing news article: %s", art.Title)

	prompt := fmt.Sprintf(`You are an expert remote work and tech industry news editor.
Analyze the following raw article details:
Title: %s
Source Snippet: %s

Your job is to rewrite this raw information into a premium, engaging, and professional tech blog/news article (approximately 200-300 words).
Ensure the tone is motivating, professional, and SEO-optimized.
Format the article body ('content') using beautiful Markdown (headers, bolding, lists). 

Also, classify the article into exactly ONE of the following categories:
- "Remote Work"
- "Tech"
- "Career"
- "Productivity"
- "Future of Work"

Write a compelling 1-2 sentence excerpt that acts as an eye-catching summary hook.

You MUST respond in valid JSON format matching this exact schema:
{
  "title": "An SEO-friendly, clean, and catchy article title",
  "category": "One of the 5 categories listed above",
  "excerpt": "Compelling 1-2 sentence hook summary",
  "content": "Full rewritten article content in markdown format"
}

Do NOT wrap the response in markdown backticks or formatting. Return ONLY the JSON object.`, art.Title, art.Content)

	genConfig := map[string]interface{}{
		"temperature": 0.7,
		"responseMimeType": "application/json",
	}

	body, err := ai.callGemini(prompt, genConfig)
	if err != nil {
		return err
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		rawText := geminiResp.Candidates[0].Content.Parts[0].Text
		rawText = strings.TrimSpace(rawText)

		var parsed struct {
			Title    string `json:"title"`
			Category string `json:"category"`
			Excerpt  string `json:"excerpt"`
			Content  string `json:"content"`
		}

		if err := json.Unmarshal([]byte(rawText), &parsed); err != nil {
			return fmt.Errorf("failed to parse structured AI output: %w. Raw output: %s", err, rawText)
		}

		if parsed.Title != "" {
			art.Title = parsed.Title
		}
		if parsed.Category != "" {
			art.Category = parsed.Category
		}
		if parsed.Excerpt != "" {
			art.Excerpt = parsed.Excerpt
		}
		if parsed.Content != "" {
			art.Content = parsed.Content
		}

		art.GenerateSlug()
		art.AssignFallbackImage()
		log.Printf("[AI] Optimized News: %s [%s] -> Slug: %s", art.Title, art.Category, art.Slug)
	}

	return nil
}

