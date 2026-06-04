package scraper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type AIService struct {
	apiKeys     []string
	keyIdx      int
	lastRequest time.Time
	mu          sync.Mutex
}

func NewAIService(apiKey string) *AIService {
	var keys []string
	for _, k := range strings.Split(apiKey, ",") {
		k = strings.TrimSpace(k)
		if k != "" {
			keys = append(keys, k)
		}
	}
	return &AIService{
		apiKeys: keys,
	}
}

// getNextKey implements key rotation and spacing logic
func (ai *AIService) getNextKey() string {
	ai.mu.Lock()
	defer ai.mu.Unlock()

	if len(ai.apiKeys) == 0 {
		return ""
	}

	// Dynamic spacing based on number of keys to optimize throughput
	// 1 key = 12s spacing, 2 keys = 6s spacing, etc. (minimum 1 second)
	spacing := 12 * time.Second / time.Duration(len(ai.apiKeys))
	if spacing < 1*time.Second {
		spacing = 1 * time.Second
	}

	elapsed := time.Since(ai.lastRequest)
	if elapsed < spacing {
		sleepDur := spacing - elapsed
		log.Printf("[AI] Spacing requests across %d keys. Sleeping for %v...", len(ai.apiKeys), sleepDur)
		time.Sleep(sleepDur)
	}
	ai.lastRequest = time.Now()

	// Rotate and return next key
	key := ai.apiKeys[ai.keyIdx]
	ai.keyIdx = (ai.keyIdx + 1) % len(ai.apiKeys)
	return key
}

// callGemini handles rotating API keys and robust retries
func (ai *AIService) callGemini(prompt string, generationConfig map[string]interface{}) ([]byte, error) {
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

	var respBody []byte
	var lastErr error

	// Retry loop allows rotating through all keys twice if rate-limited
	maxAttempts := len(ai.apiKeys) * 2
	if maxAttempts < 3 {
		maxAttempts = 3
	}

	for attempt := 1; attempt <= maxAttempts; attempt++ {
		key := ai.getNextKey()
		if key == "" {
			return nil, fmt.Errorf("no gemini API keys configured")
		}

		model := os.Getenv("GEMINI_MODEL")
		if model == "" {
			model = "gemini-2.5-flash-lite"
		}
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, key)

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			return nil, fmt.Errorf("failed to create gemini request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 35 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("failed to call gemini api: %w", err)
			time.Sleep(1 * time.Second)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close() // Close body immediately to avoid resource leaks
		if err != nil {
			lastErr = fmt.Errorf("failed to read gemini response body: %w", err)
			continue
		}

		if resp.StatusCode != 200 {
			lastErr = fmt.Errorf("gemini API error: %d - %s", resp.StatusCode, string(body))
			if resp.StatusCode == 429 || resp.StatusCode == 503 {
				log.Printf("[AI] Key %d returned status %d. Rotating to next key (attempt %d/%d)...", (ai.keyIdx-1+len(ai.apiKeys))%len(ai.apiKeys), resp.StatusCode, attempt, maxAttempts)
				time.Sleep(1 * time.Second)
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

// CallGemini is a public wrapper around callGemini
func (ai *AIService) CallGemini(prompt string, generationConfig map[string]interface{}) ([]byte, error) {
	return ai.callGemini(prompt, generationConfig)
}

// OptimizeJob content for SEO using AI
func (ai *AIService) OptimizeJob(job *shared.Job) error {
	if len(ai.apiKeys) == 0 {
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
	if len(ai.apiKeys) == 0 {
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
		"temperature":      0.7,
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

// OptimizeJobsBatch optimizes multiple jobs in a single API call to conserve quota
func (ai *AIService) OptimizeJobsBatch(jobs []*shared.Job) error {
	if len(ai.apiKeys) == 0 || len(jobs) == 0 {
		return nil
	}

	log.Printf("[AI] Batch optimizing %d jobs...", len(jobs))

	var sb strings.Builder
	todayStr := time.Now().Format("2006-01-02")
	sb.WriteString(fmt.Sprintf("You are an expert HR Specialist and recruiter. For each job posting below:\n" +
		"1. Rewrite the job description into engaging, professional, SEO-optimized markdown with clear sections (About the Role, Responsibilities, Requirements, Benefits, etc. if mentioned). Keep all factual details (salary, location, company name, technical requirements) exactly as stated. Do not invent any new details.\n" +
		"2. Extract the application deadline / closing date if mentioned anywhere in the job description or metadata (e.g. 'apply by June 30', 'closing date: 2026-06-30', 'deadline: 30 June'). If relative dates are mentioned (e.g., 'applications close in 2 weeks'), calculate it relative to today's date: %s.\n\n"+
		"Respond with a JSON array of objects, one per job, in the same order. Each object must have these exact keys:\n"+
		"- \"description\": (string) the rewritten job description\n"+
		"- \"deadline_iso\": (string or null) the extracted/calculated deadline date in YYYY-MM-DD format, or null if not specified.\n", todayStr))

	for i, j := range jobs {
		// Truncate very long descriptions to save tokens, but keep it high enough to capture full details
		desc := j.Description
		if len(j.Description) > 15000 {
			desc = desc[:15000] + "..."
		}
		sb.WriteString(fmt.Sprintf("\n--- JOB %d ---\n%s\n", i, desc))
	}

	genConfig := map[string]interface{}{
		"temperature":      0.7,
		"responseMimeType": "application/json",
	}

	body, err := ai.callGemini(sb.String(), genConfig)
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
		
		var results []struct {
			Description string  `json:"description"`
			DeadlineISO *string `json:"deadline_iso"`
		}
		
		if err := json.Unmarshal([]byte(rawText), &results); err != nil {
			return fmt.Errorf("failed to parse structured AI output as JSON array: %w. Raw: %s", err, rawText)
		}

		if len(results) != len(jobs) {
			return fmt.Errorf("AI returned %d results, expected %d", len(results), len(jobs))
		}

		for i, j := range jobs {
			res := results[i]
			desc := strings.TrimSpace(res.Description)
			desc = strings.TrimPrefix(desc, "```markdown")
			desc = strings.TrimPrefix(desc, "```")
			desc = strings.TrimSuffix(desc, "```")
			j.Description = strings.TrimSpace(desc)

			if res.DeadlineISO != nil && *res.DeadlineISO != "" {
				deadlineStr := strings.TrimSpace(*res.DeadlineISO)
				if parsedTime, err := time.Parse("2006-01-02", deadlineStr); err == nil {
					expires := time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(), 23, 59, 59, 0, time.Local)
					if expires.After(time.Now()) {
						j.ExpiresAt = expires
						log.Printf("[AI] Extracted deadline for %s: %s", j.Title, j.ExpiresAt.Format("2006-01-02 15:04:05"))
					}
				}
			}
			log.Printf("[AI] Successfully optimized (batch): %s", j.Title)
		}
	}

	return nil
}

type AIArticle struct {
	Title    string `json:"title"`
	Category string `json:"category"`
	Excerpt  string `json:"excerpt"`
	Content  string `json:"content"`
}

// OptimizeNewsBatch rewrites multiple news snippets in a single API call
func (ai *AIService) OptimizeNewsBatch(articles []*shared.News) error {
	if len(ai.apiKeys) == 0 || len(articles) == 0 {
		return nil
	}

	log.Printf("[AI] Batch optimizing %d news articles...", len(articles))

	var sb strings.Builder
	sb.WriteString("Rewrite each article snippet into a ~200 word professional tech blog post. Classify into one of: Remote Work, Tech, Career, Productivity, Future of Work. Respond with a JSON array of objects with keys: title, category, excerpt, content.\n")

	for i, art := range articles {
		snippet := art.Content
		if len(snippet) > 1000 {
			snippet = snippet[:1000] + "..."
		}
		sb.WriteString(fmt.Sprintf("\n--- ARTICLE %d ---\nTitle: %s\nSnippet: %s\n", i, art.Title, snippet))
	}

	genConfig := map[string]interface{}{
		"temperature":      0.7,
		"responseMimeType": "application/json",
	}

	body, err := ai.callGemini(sb.String(), genConfig)
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
		var results []AIArticle
		if err := json.Unmarshal([]byte(rawText), &results); err != nil {
			return fmt.Errorf("failed to parse structured AI output as JSON array: %w. Raw: %s", err, rawText)
		}

		if len(results) != len(articles) {
			return fmt.Errorf("AI returned %d articles, expected %d", len(results), len(articles))
		}

		for i, art := range articles {
			parsed := results[i]
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
			log.Printf("[AI] Optimized News (batch): %s [%s] -> Slug: %s", art.Title, art.Category, art.Slug)
		}
	}

	return nil
}
