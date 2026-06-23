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

CRUCIAL INSTRUCTION: You MUST start the markdown output with a dedicated section exactly titled:
## ✨ AI Insights & Summary
In this section, write a compelling, unique 3-4 sentence editorial pitch evaluating the role, the company, and why it's a great opportunity based on the context. This must provide unique publisher value.

Then format the rest of the job details with clear sections using markdown:
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

	prompt := fmt.Sprintf(`You are a senior editor and storyteller at FutureTalents — a leading platform for remote jobs and tech careers.
Analyze the following raw article:
Title: %s
Source Snippet: %s

Your job is to transform this raw information into a compelling, story-driven blog post that reads like it was written by a real human expert.

STORYTELLING RULES (MANDATORY):
- Open with a vivid real-world scenario or mini-story about a real person (e.g., "Meet Aisha, a software engineer in Lagos who quit her 9-to-5 last year and..."). Make readers feel seen.
- Include at least 2 specific real-life examples, named companies, or cited industry data points to build credibility.
- Write in a warm, conversational, first-person-plural voice ("We all know the feeling...", "Here's what the data actually shows...").
- End with a powerful call-to-action or memorable takeaway line.

FORMATTING RULES (MANDATORY):
- Use # (H1) for the opening pull-quote or bold first hook line (one time only, at the very top)
- Use ## (H2) for all major section headings (minimum 3 sections)
- Use ### (H3) for sub-points or examples within sections
- Use **bold** for key terms and statistics
- Use bullet lists sparingly — only for genuine lists, not as lazy structure
- Target 550-700 words

SEO & CTR RULES:
- The title must use power words: numbers ("7 Reasons..."), curiosity gaps ("The Truth About..."), or strong emotion ("Why Every Developer Should...")
- Write a 2-sentence excerpt that creates urgency and makes readers click
- Classify into exactly ONE: Remote Work, Tech, Career, Productivity, Future of Work

You MUST respond in valid JSON:
{
  "title": "High-CTR, story-worthy title",
  "category": "One of the 5 categories",
  "excerpt": "2-sentence compelling hook",
  "content": "Full story-mode article in markdown with # H1 hook, ## H2 sections, ### H3 sub-points"
}

Return ONLY the JSON object. Do NOT wrap in backticks.`, art.Title, art.Content)

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
		"1. Rewrite the job description into engaging, professional, SEO-optimized markdown with clear sections. " +
		"CRUCIAL INSTRUCTION: You MUST start the markdown output with a dedicated section exactly titled:\n" +
		"## ✨ AI Insights & Summary\n" +
		"In this section, write a compelling, unique 3-4 sentence editorial pitch evaluating the role, the company, and why it's a great opportunity. This must provide unique publisher value.\n" +
		"Then follow with standard sections (About the Role, Responsibilities, Requirements, Benefits, etc. if mentioned). Keep all factual details exactly as stated. Do not invent any new details.\n" +
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
func (ai *AIService) OptimizeNewsBatch(articles []*shared.News, seoFormat bool) error {
	if len(ai.apiKeys) == 0 || len(articles) == 0 {
		return nil
	}

	log.Printf("[AI] Batch optimizing %d news articles (SEO format=%v)...", len(articles), seoFormat)

	var sb strings.Builder
	sb.WriteString(`You are a senior storytelling editor at FutureTalents — a platform for remote jobs and tech careers.
For each article snippet below, write a compelling, story-driven blog post that feels human, relatable, and authoritative.

STORYTELLING RULES (MANDATORY FOR ALL ARTICLES):
- Open each article with a vivid real-world scenario featuring a named fictional but believable person (e.g., "Meet James, a backend developer in Manila who..."). This is the human hook.
- Include at least 2 specific real-life examples: named companies, actual statistics, or real industry events.
- Write in a warm, confident editorial voice. Avoid robotic summaries — this should read like a feature in a tech magazine.
- End with a memorable takeaway or actionable tip.

FORMATTING RULES (MANDATORY FOR ALL ARTICLES):
- # (H1): One bold opening hook/pull-quote at the top of the article
- ## (H2): Minimum 3 major section headings per article
- ### (H3): Sub-points or named examples within sections
- **bold** important stats and key phrases
- Target 550-700 words per article
`)

	// Inject extra SEO heading enforcement if enabled in admin settings
	if seoFormat {
		sb.WriteString(`
CRITICAL SEO FORMAT REQUIREMENT:
You MUST structure the article body using clean, hierarchical SEO headings:
- Exactly 1× # (H1) as the opening hook line
- At least 3× ## (H2) for major sections
- At least 2× ### (H3) for sub-points within sections
Google prioritizes content with clear heading hierarchy for featured snippets and rich results.
`)
	}

	sb.WriteString(`
SEO & CTR RULES:
- Titles must use power words: numbers, curiosity gaps, or strong emotional language
- Excerpt must be 2 punchy sentences that create urgency
- Classify each into ONE of: Remote Work, Tech, Career, Productivity, Future of Work

Respond with a JSON array of objects with keys: title, category, excerpt, content.
Do NOT wrap in backticks. Return ONLY the JSON array.
`)

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

// GeneratedArticle holds the raw JSON response from Gemini for a generated article
type GeneratedArticle struct {
	Title        string `json:"title"`
	Category     string `json:"category"`
	Excerpt      string `json:"excerpt"`
	Content      string `json:"content"`
	ImageKeyword string `json:"image_keyword"`
}

// GenerateOriginalArticles creates completely original articles using Gemini, inspired by recent job context
func (ai *AIService) GenerateOriginalArticles(jobsContext []shared.Job, count int, seoFormat bool) ([]shared.News, error) {
	if len(ai.apiKeys) == 0 {
		return nil, fmt.Errorf("no AI keys configured")
	}

	log.Printf("[AI] Generating %d original articles based on %d recent jobs context...", count, len(jobsContext))

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`You are a senior editorial writer and storyteller at FutureTalents.
Your task is to write exactly %d highly compelling, story-driven, original blog articles.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STORYTELLING RULES — MANDATORY FOR EVERY ARTICLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. OPEN WITH A HUMAN STORY
   Every article MUST open with a short, vivid mini-story about a named, believable person.
   Example: "Karim had been a product manager at a Dhaka startup for six years. Then one Tuesday morning, he opened his laptop and found a Slack message that changed everything..."
   This person's journey should frame the entire article.

2. USE REAL-WORLD EXAMPLES
   Include at least 2 specific, credible examples:
   - Named companies (Google, Shopify, Automattic, GitLab, Airbnb, etc.)
   - Actual studies or statistics (cite source inline: "per a 2024 Stanford study...")
   - Real industry trends or events
   Do NOT make up fake statistics. Use plausible, general knowledge facts.

3. WRITE LIKE A HUMAN EXPERT
   - Warm, confident, slightly opinionated voice ("Here's the uncomfortable truth...", "What nobody tells you is...")
   - Use contractions ("don't", "we've", "it's")
   - Avoid corporate jargon and buzzword soup
   - End with a specific, actionable takeaway or memorable closing line

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEADING STRUCTURE RULES — MANDATORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The "content" field MUST follow this exact heading hierarchy:

# [Bold opening hook or pull-quote — one line that stops scrollers]

## [Major Section 1 — e.g., "The Problem Nobody Talks About"]
   Body text with story, data, examples...

### [Sub-point or named example — e.g., "How GitLab Did It"]
   Supporting details...

## [Major Section 2 — e.g., "What the Data Actually Shows"]
   ...

## [Major Section 3 — e.g., "5 Steps You Can Take Starting Today"]
   ...

Minimum: 1× H1, 3× H2, 2× H3 per article
Target: 600-800 words per article

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEO & CTR RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TITLES must use at least one of:
- A number ("7 Things...", "The 3 Mistakes...")
- A curiosity gap ("The Truth About...", "What Nobody Tells You About...")
- Strong emotion / urgency ("Why Every Developer Should...", "Stop Doing This If You Want to...")

EXCERPT = 2 punchy sentences that make someone stop scrolling and click.

GOOGLE ADSENSE COMPLIANCE:
- Unique, high-value content only
- No clickbait or deception
- Safe for all audiences
- Demonstrates E-E-A-T (Experience, Expertise, Authority, Trust)

Draw loose inspiration from these recent FutureTalents job postings (DO NOT just list jobs — use them to identify industry trends, skills in demand, or career narratives):

Context Jobs:
`, count))

	for _, j := range jobsContext {
		sb.WriteString(fmt.Sprintf("- %s at %s (%s)\n", j.Title, j.Company, j.Category))
	}

	sb.WriteString(`
Classify each article into one of: Remote Work, Tech, Career, Productivity, Future of Work.
Generate a specific 1-3 word "image_keyword" that visually represents the article topic (e.g., "remote developer", "team meeting", "AI robot"). No special characters.

You MUST respond in valid JSON format as an array of objects:
[
  {
    "title": "High-CTR title with power words",
    "category": "One of the 5 categories",
    "excerpt": "2-sentence punchy hook",
    "content": "Full story-mode article with # H1 hook, ## H2 sections, ### H3 sub-points, 600-800 words",
    "image_keyword": "2-3 word topic keyword for image search"
  }
]
Return ONLY the JSON array. Do NOT wrap in backticks or markdown.`)

	genConfig := map[string]interface{}{
		"temperature":      0.8, // Slightly higher for creativity
		"responseMimeType": "application/json",
	}

	body, err := ai.callGemini(sb.String(), genConfig)
	if err != nil {
		return nil, err
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
		return nil, fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from gemini")
	}

	rawText := geminiResp.Candidates[0].Content.Parts[0].Text
	var results []GeneratedArticle
	if err := json.Unmarshal([]byte(rawText), &results); err != nil {
		return nil, fmt.Errorf("failed to parse structured AI output as JSON array: %w. Raw: %s", err, rawText)
	}

	var articles []shared.News
	for _, res := range results {
		if res.Title == "" || res.Content == "" {
			continue // Skip invalid items
		}
		
		art := shared.News{
			Title:       res.Title,
			Category:    res.Category,
			Excerpt:     res.Excerpt,
			Content:     res.Content,
			Author:      "FutureTalents",
			PublishedAt: time.Now(),
		}
		art.GenerateSlug()
		art.URL = "https://www.futuretalent.online/blog/" + art.Slug
		
		// Assign dynamic image based on keyword
		if res.ImageKeyword != "" {
			art.AssignDynamicImage(res.ImageKeyword)
		} else {
			art.AssignFallbackImage()
		}
		
		articles = append(articles, art)
		log.Printf("[AI] Generated Article: %s [%s]", art.Title, art.Category)
	}

	return articles, nil
}
