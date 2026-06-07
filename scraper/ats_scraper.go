package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type AtsScraper struct {
	aiService *AIService
	client    *http.Client
}

func NewAtsScraper(ai *AIService) *AtsScraper {
	return &AtsScraper{
		aiService: ai,
		client:    &http.Client{Timeout: 20 * time.Second},
	}
}

func (a *AtsScraper) Name() string {
	return "ATS Company Scraper"
}

// Curated top-tier fallback companies
var fallbackLeverCompanies = []string{
	"hotjar", "vercel", "postman", "clever", "mux", "coder",
	"linear", "buffer", "gitbook", "tailscale", "bluelightconsulting",
}

var fallbackGreenhouseCompanies = []string{
	"gitlab", "hashicorp", "reddit", "cloudflare", "elastic",
	"mongodb", "snyk", "vimeo", "auth0", "dbtlabs", "grafana",
}

// Custom websites to crawl and parse using AI
var customCareersPages = []map[string]string{
	{"name": "Fly.io", "url": "https://fly.io/jobs/"},
	{"name": "Railway", "url": "https://railway.app/careers"},
	{"name": "Supabase", "url": "https://supabase.com/careers"},
	{"name": "Brain Station 23", "url": "https://brainstation-23.com/career/"},
	{"name": "SELISE", "url": "https://selise.ch/career/"},
	{"name": "Leapfrog Technology", "url": "https://www.lftechnology.com/careers"},
}

type discoveredBoards struct {
	Lever      []string `json:"lever"`
	Greenhouse []string `json:"greenhouse"`
}

func (a *AtsScraper) Crawl() ([]shared.Job, error) {
	log.Println("[ATS Scraper] Starting crawl cycle...")

	// Default to fallback lists
	leverSlugs := fallbackLeverCompanies
	greenhouseSlugs := fallbackGreenhouseCompanies

	// Try to discover more target companies using Gemini
	discovered, err := a.discoverCompaniesViaAI()
	if err != nil {
		log.Printf("[ATS Scraper] ⚠️ AI board discovery failed (will use fallback list only): %v", err)
	} else {
		// Merge and deduplicate Lever slugs
		if len(discovered.Lever) > 0 {
			seen := make(map[string]bool)
			var merged []string
			for _, s := range fallbackLeverCompanies {
				seen[s] = true
				merged = append(merged, s)
			}
			for _, s := range discovered.Lever {
				s = strings.TrimSpace(strings.ToLower(s))
				if s != "" && !seen[s] {
					seen[s] = true
					merged = append(merged, s)
				}
			}
			leverSlugs = merged
			log.Printf("[ATS Scraper] 🧠 AI discovered & merged Lever boards. Total queue: %d", len(leverSlugs))
		}

		// Merge and deduplicate Greenhouse slugs
		if len(discovered.Greenhouse) > 0 {
			seen := make(map[string]bool)
			var merged []string
			for _, s := range fallbackGreenhouseCompanies {
				seen[s] = true
				merged = append(merged, s)
			}
			for _, s := range discovered.Greenhouse {
				s = strings.TrimSpace(strings.ToLower(s))
				if s != "" && !seen[s] {
					seen[s] = true
					merged = append(merged, s)
				}
			}
			greenhouseSlugs = merged
			log.Printf("[ATS Scraper] 🧠 AI discovered & merged Greenhouse boards. Total queue: %d", len(greenhouseSlugs))
		}
	}

	// Shuffle and limit slugs to avoid hitting API rate limits or processing too many jobs in one cycle
	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(leverSlugs), func(i, j int) { leverSlugs[i], leverSlugs[j] = leverSlugs[j], leverSlugs[i] })
	rand.Shuffle(len(greenhouseSlugs), func(i, j int) { greenhouseSlugs[i], greenhouseSlugs[j] = greenhouseSlugs[j], greenhouseSlugs[i] })

	// Limit to 5 Lever and 5 Greenhouse companies per cycle to keep runtimes fast and stay inside API guidelines
	maxBoards := 5
	if len(leverSlugs) > maxBoards {
		leverSlugs = leverSlugs[:maxBoards]
	}
	if len(greenhouseSlugs) > maxBoards {
		greenhouseSlugs = greenhouseSlugs[:maxBoards]
	}

	var allJobs []shared.Job

	// 2. Fetch jobs from Lever boards
	for _, slug := range leverSlugs {
		jobs, err := a.crawlLeverCompany(slug)
		if err != nil {
			log.Printf("[ATS Scraper] Error crawling Lever board for %s: %v", slug, err)
			continue
		}
		allJobs = append(allJobs, jobs...)
		time.Sleep(1 * time.Second) // Small polite delay
	}

	// 3. Fetch jobs from Greenhouse boards
	for _, slug := range greenhouseSlugs {
		jobs, err := a.crawlGreenhouseCompany(slug)
		if err != nil {
			log.Printf("[ATS Scraper] Error crawling Greenhouse board for %s: %v", slug, err)
			continue
		}
		allJobs = append(allJobs, jobs...)
		time.Sleep(1 * time.Second) // Small polite delay
	}

	// 4. Crawl 1-2 random custom pages using AI
	rand.Shuffle(len(customCareersPages), func(i, j int) { customCareersPages[i], customCareersPages[j] = customCareersPages[j], customCareersPages[i] })
	maxCustom := 2
	for i := 0; i < maxCustom && i < len(customCareersPages); i++ {
		target := customCareersPages[i]
		log.Printf("[ATS Scraper] Scraping custom page using AI: %s (%s)", target["name"], target["url"])
		jobs, err := a.crawlCustomPageAI(target["name"], target["url"])
		if err != nil {
			log.Printf("[ATS Scraper] Error crawling custom page %s: %v", target["name"], err)
			continue
		}
		allJobs = append(allJobs, jobs...)
		time.Sleep(2 * time.Second)
	}

	log.Printf("[ATS Scraper] Ingestion cycle complete! Fetched a total of %d jobs.", len(allJobs))
	return allJobs, nil
}

// discoverCompaniesViaAI queries Gemini to recommend active Greenhouse/Lever company boards
func (a *AtsScraper) discoverCompaniesViaAI() (*discoveredBoards, error) {
	if a.aiService == nil || len(a.aiService.apiKeys) == 0 {
		return nil, fmt.Errorf("AI Service not available")
	}

	prompt := `Act as a recruitment database assistant.
Identify 10 real, well-known tech startups or mid-market companies that actively hire remote software developers and host their job board on Lever (jobs.lever.co/companyName) or Greenhouse (boards.greenhouse.io/companyName).

CRITICAL INSTRUCTIONS:
- Do NOT list giant companies like Shopify, Apple, Google, Microsoft, Netflix, Airbnb, Asana, Slack, Stripe, or Pinterest. They use custom domains or enterprise integrations that return 404 on public board APIs.
- Instead, suggest high-growth remote-first startups and developer-focused companies that use standard open boards (e.g. 'hotjar', 'vercel', 'postman', 'snyk', 'clerk', 'docker', 'tailscale', 'hashicorp', 'gitlab', 'codecov', 'grafana', 'dbtlabs').
- Ensure the company slug name is valid, lowercase, and matches the URL slug exactly (e.g. jobs.lever.co/companyName or boards.greenhouse.io/companyName).

Respond ONLY with a JSON object matching this schema:
{
  "lever": ["slug1", "slug2", ...],
  "greenhouse": ["slug1", "slug2", ...]
}
Do not include any other text, formatting, or markdown wrappers.`

	genConfig := map[string]interface{}{
		"temperature":      0.5,
		"responseMimeType": "application/json",
	}

	body, err := a.aiService.CallGemini(prompt, genConfig)
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
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	rawText := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	var boards discoveredBoards
	if err := json.Unmarshal([]byte(rawText), &boards); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from AI: %w. Raw: %s", err, rawText)
	}

	return &boards, nil
}


// Lever API Structures
type leverPosting struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	DescriptionPlain string `json:"descriptionPlain"`
	HostedURL        string `json:"hostedUrl"`
	CreatedAt        int64  `json:"createdAt"`
	Categories       struct {
		Commitment string `json:"commitment"`
		Location   string `json:"location"`
		Team       string `json:"team"`
		Department string `json:"department"`
	} `json:"categories"`
}

func (a *AtsScraper) crawlLeverCompany(companySlug string) ([]shared.Job, error) {
	apiURL := fmt.Sprintf("https://api.lever.co/v0/postings/%s", companySlug)
	log.Printf("[ATS Scraper] Fetching Lever listings for company: %s", companySlug)

	resp, err := a.client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Lever API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var postings []leverPosting
	if err := json.Unmarshal(body, &postings); err != nil {
		return nil, err
	}

	var jobs []shared.Job
	for _, p := range postings {
		// Filter for remote / software / tech jobs
		titleLower := strings.ToLower(p.Title)
		locLower := strings.ToLower(p.Categories.Location)
		teamLower := strings.ToLower(p.Categories.Team + " " + p.Categories.Department)

		isRemote := strings.Contains(locLower, "remote") || strings.Contains(locLower, "anywhere") || strings.Contains(locLower, "worldwide")
		isTech := strings.Contains(titleLower, "engineer") || strings.Contains(titleLower, "developer") ||
			strings.Contains(titleLower, "qa") || strings.Contains(titleLower, "devops") ||
			strings.Contains(titleLower, "security") || strings.Contains(titleLower, "data") ||
			strings.Contains(teamLower, "engineering") || strings.Contains(teamLower, "technology") || strings.Contains(teamLower, "product")

		if !isRemote || !isTech {
			continue
		}

		location := p.Categories.Location
		if location == "" {
			location = "Remote"
		}

		workplaceType := shared.DetectWorkplaceType(p.Title, location, p.DescriptionPlain)
		remoteType := "worldwide"
		if workplaceType == "onsite" {
			remoteType = "country"
		} else {
			if strings.Contains(strings.ToLower(location), "us") || strings.Contains(strings.ToLower(location), "united states") ||
				strings.Contains(strings.ToLower(location), "europe") || strings.Contains(strings.ToLower(location), "germany") {
				remoteType = "country"
			}
		}

		postedAt := time.Unix(p.CreatedAt/1000, 0)
		category := CategorizeJob(p.Title, nil, p.Categories.Team)

		// format company title nicely
		companyName := strings.Title(strings.ReplaceAll(companySlug, "-", " "))

		job := shared.Job{
			Title:         p.Title,
			Company:       companyName,
			Location:      location,
			Description:   p.DescriptionPlain,
			Source:        "Lever",
			URL:           p.HostedURL,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			PostedAt:      postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[ATS Scraper] Crawled %d remote positions for Lever company: %s", len(jobs), companySlug)
	return jobs, nil
}

// Greenhouse API Structures
type greenhouseOffice struct {
	Name     string `json:"name"`
	Location string `json:"location"`
}

type greenhouseDept struct {
	Name string `json:"name"`
}

type greenhouseJob struct {
	ID          int                `json:"id"`
	Title       string             `json:"title"`
	Content     string             `json:"content"`
	AbsoluteURL string             `json:"absolute_url"`
	UpdatedAt   string             `json:"updated_at"`
	Offices     []greenhouseOffice `json:"offices"`
	Departments []greenhouseDept   `json:"departments"`
}

type greenhouseResponse struct {
	Jobs []greenhouseJob `json:"jobs"`
}

func (a *AtsScraper) crawlGreenhouseCompany(companySlug string) ([]shared.Job, error) {
	apiURL := fmt.Sprintf("https://boards-api.greenhouse.io/v1/boards/%s/jobs?content=true", companySlug)
	log.Printf("[ATS Scraper] Fetching Greenhouse listings for company: %s", companySlug)

	resp, err := a.client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Greenhouse API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var apiResp greenhouseResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, err
	}

	var jobs []shared.Job
	for _, gj := range apiResp.Jobs {
		// Detect if remote by office locations
		isRemote := false
		location := ""
		for _, office := range gj.Offices {
			officeNameLower := strings.ToLower(office.Name)
			officeLocLower := strings.ToLower(office.Location)
			if strings.Contains(officeNameLower, "remote") || strings.Contains(officeLocLower, "remote") ||
				strings.Contains(officeNameLower, "worldwide") || strings.Contains(officeNameLower, "anywhere") {
				isRemote = true
				location = office.Name
				break
			}
		}

		if !isRemote {
			// Fall back to title or description heuristics
			titleLower := strings.ToLower(gj.Title)
			if strings.Contains(titleLower, "remote") || strings.Contains(titleLower, "anywhere") {
				isRemote = true
				location = "Remote"
			}
		}

		if !isRemote {
			continue
		}

		// Filter for Tech
		titleLower := strings.ToLower(gj.Title)
		deptLower := ""
		for _, d := range gj.Departments {
			deptLower += " " + strings.ToLower(d.Name)
		}

		isTech := strings.Contains(titleLower, "engineer") || strings.Contains(titleLower, "developer") ||
			strings.Contains(titleLower, "qa") || strings.Contains(titleLower, "devops") ||
			strings.Contains(titleLower, "security") || strings.Contains(titleLower, "data") ||
			strings.Contains(deptLower, "engineering") || strings.Contains(deptLower, "technology") || strings.Contains(deptLower, "product")

		if !isTech {
			continue
		}

		// Clean HTML content
		desc := CleanHTML(gj.Content)

		workplaceType := shared.DetectWorkplaceType(gj.Title, location, desc)
		remoteType := "worldwide"
		if workplaceType == "onsite" {
			remoteType = "country"
		} else {
			if strings.Contains(strings.ToLower(location), "us") || strings.Contains(strings.ToLower(location), "united states") ||
				strings.Contains(strings.ToLower(location), "europe") || strings.Contains(strings.ToLower(location), "germany") {
				remoteType = "country"
			}
		}

		postedAt := time.Now()
		if gj.UpdatedAt != "" {
			if parsed, err := time.Parse(time.RFC3339, gj.UpdatedAt); err == nil {
				postedAt = parsed
			}
		}

		category := CategorizeJob(gj.Title, nil, deptLower)
		companyName := strings.Title(strings.ReplaceAll(companySlug, "-", " "))

		job := shared.Job{
			Title:         gj.Title,
			Company:       companyName,
			Location:      location,
			Description:   desc,
			Source:        "Greenhouse",
			URL:           gj.AbsoluteURL,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			PostedAt:      postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[ATS Scraper] Crawled %d remote positions for Greenhouse company: %s", len(jobs), companySlug)
	return jobs, nil
}

// crawlCustomPageAI crawls a custom HTML careers page and uses Gemini to parse it
func (a *AtsScraper) crawlCustomPageAI(companyName, pageURL string) ([]shared.Job, error) {
	if a.aiService == nil || len(a.aiService.apiKeys) == 0 {
		return nil, fmt.Errorf("AI Service not available")
	}

	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("custom page returned status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	cleanedText := CleanHTML(string(bodyBytes))

	// Truncate to save token quota (Gemini 2.5 Flash handles larger contexts, but let's keep it under 15000 characters)
	if len(cleanedText) > 15000 {
		cleanedText = cleanedText[:15000] + "\n... [TRUNCATED] ..."
	}

	prompt := fmt.Sprintf(`You are a recruiting data extraction assistant.
Analyze the following cleaned text and links from the careers page of %s.
Identify active software engineering, developer, IT, cloud/devops, or designer roles that are remote or hybrid.

For each job, extract the title, location, salary (if specified), and absolute application/details link.
Respond ONLY with a JSON array matching this exact schema (do NOT wrap it in code blocks or add text before/after):
[
  {
    "title": "Job Title (e.g. Senior Backend Engineer)",
    "company": "%s",
    "location": "Location (e.g. Remote US, Worldwide)",
    "description": "Brief description of requirements or qualifications (under 1000 characters)",
    "url": "Application URL (must be an absolute URL found on the page)",
    "workplace_type": "remote",
    "remote_type": "worldwide",
    "category": "Mapped to a standard category"
  }
]

Standard Categories:
- Cybersecurity
- QA & Testing
- AI & Machine Learning
- Cloud & DevOps
- Mobile Development
- Data Science & Analytics
- Frontend Development
- Backend Development
- Fullstack Development
- Design & Creative
- Product Management
- Marketing & Sales
- Customer Support
- Writing & Content
- HR & Operations

If no remote engineering/tech jobs are found, return an empty array [].

Page Content to Analyze:
%s`, companyName, companyName, cleanedText)

	genConfig := map[string]interface{}{
		"temperature":      0.2,
		"responseMimeType": "application/json",
	}

	body, err := a.aiService.CallGemini(prompt, genConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to call Gemini for page parsing: %w", err)
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
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from Gemini")
	}

	rawText := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	var parsedJobs []struct {
		Title         string `json:"title"`
		Company       string `json:"company"`
		Location      string `json:"location"`
		Description   string `json:"description"`
		URL           string `json:"url"`
		WorkplaceType string `json:"workplace_type"`
		RemoteType    string `json:"remote_type"`
		Category      string `json:"category"`
	}

	if err := json.Unmarshal([]byte(rawText), &parsedJobs); err != nil {
		return nil, fmt.Errorf("failed to parse JSON from AI: %w. Raw: %s", err, rawText)
	}

	var jobs []shared.Job
	for _, pj := range parsedJobs {
		if pj.Title == "" || pj.URL == "" {
			continue
		}

		// Ensure application URL is absolute
		appURL := pj.URL
		if strings.HasPrefix(appURL, "/") {
			// Resolve relative URL
			parsedBase, err := url.Parse(pageURL)
			if err == nil {
				appURL = parsedBase.Scheme + "://" + parsedBase.Host + appURL
			}
		}

		// Clean Workplace type
		workplace := "remote"
		if pj.WorkplaceType == "hybrid" || pj.WorkplaceType == "onsite" {
			workplace = pj.WorkplaceType
		}

		remote := "worldwide"
		locLower := strings.ToLower(pj.Location)
		if strings.Contains(locLower, "us") || strings.Contains(locLower, "united states") ||
			strings.Contains(locLower, "europe") || strings.Contains(locLower, "germany") {
			remote = "country"
		}

		job := shared.Job{
			Title:         pj.Title,
			Company:       pj.Company,
			Location:      pj.Location,
			Description:   pj.Description,
			Source:        "Direct Company Site",
			URL:           appURL,
			RemoteType:    remote,
			WorkplaceType: workplace,
			Category:      pj.Category,
			PostedAt:      time.Now(),
		}

		// Fetch the full job description from the application URL
		log.Printf("[ATS Scraper] Fetching full job description for %s at %s", job.Title, job.URL)
		req, err := http.NewRequest("GET", job.URL, nil)
		if err == nil {
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
			resp, err := a.client.Do(req)
			if err == nil && resp.StatusCode == 200 {
				bodyBytes, err := io.ReadAll(resp.Body)
				if err == nil {
					cleanDesc := CleanHTML(string(bodyBytes))
					if len(cleanDesc) > 500 {
						job.Description = cleanDesc
					}
				}
				resp.Body.Close()
			}
		}

		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[ATS Scraper] AI extracted %d remote jobs from custom page: %s", len(jobs), companyName)
	return jobs, nil
}

// CleanHTML removes script, style, svg tags and parses text while maintaining links
func CleanHTML(htmlStr string) string {
	// 1. Remove comments
	htmlStr = removeTag(htmlStr, "script")
	htmlStr = removeTag(htmlStr, "style")
	htmlStr = removeTag(htmlStr, "svg")
	htmlStr = removeTag(htmlStr, "noscript")
	htmlStr = removeTag(htmlStr, "nav")
	htmlStr = removeTag(htmlStr, "footer")

	// 2. Replace anchor tags with simple [LINK: url] markers
	htmlStr = replaceAnchorTags(htmlStr)

	// 3. Remove all other HTML tags
	var sb strings.Builder
	inTag := false
	inComment := false

	for i := 0; i < len(htmlStr); i++ {
		char := htmlStr[i]
		if inComment {
			if i+2 < len(htmlStr) && htmlStr[i:i+3] == "-->" {
				inComment = false
				i += 2
			}
			continue
		}
		if i+3 < len(htmlStr) && htmlStr[i:i+4] == "<!--" {
			inComment = true
			i += 3
			continue
		}
		if char == '<' {
			inTag = true
			continue
		}
		if char == '>' {
			inTag = false
			sb.WriteByte(' ')
			continue
		}
		if !inTag {
			sb.WriteByte(char)
		}
	}

	// Clean up whitespaces
	lines := strings.Split(sb.String(), "\n")
	var cleanLines []string
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		// Strip multiple spaces
		reSpace := regexp.MustCompile(`\s+`)
		trimmed = reSpace.ReplaceAllString(trimmed, " ")
		if trimmed != "" {
			cleanLines = append(cleanLines, trimmed)
		}
	}
	return strings.Join(cleanLines, "\n")
}

func removeTag(htmlStr, tagName string) string {
	re := regexp.MustCompile(fmt.Sprintf(`(?is)<%s\b[^>]*>.*?</%s>`, tagName, tagName))
	return re.ReplaceAllString(htmlStr, "")
}

func replaceAnchorTags(htmlStr string) string {
	re := regexp.MustCompile(`(?i)<a\s+[^>]*href=["']([^"']+)["'][^>]*>`)
	return re.ReplaceAllString(htmlStr, " [LINK: $1] ")
}
