package scraper

import (
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// minRawDescriptionLength is the minimum character count a scraped description
// must have BEFORE being sent to Gemini. Jobs below this are thin-content stubs.
const minRawDescriptionLength = 200

// isThinContent returns true if the AI-rewritten job description is too sparse to publish.
// Criteria:
//   - Fewer than 150 words (too little content for SEO)
//   - Contains known placeholder strings from scrapers that had no data to rewrite
func isThinContent(desc string) bool {
	// Known placeholder markers produced when scrapers return empty job details
	thinMarkers := []string{
		"[company information missing]",
		"[responsibilities missing]",
		"[requirements missing]",
		"no specific responsibilities listed",
		"no specific requirements listed",
		"no responsibilities listed",
		"no requirements listed",
		"information not available",
		"not mentioned in the job",
		"not specified in the job",
	}

	lower := strings.ToLower(desc)
	for _, marker := range thinMarkers {
		if strings.Contains(lower, marker) {
			return true
		}
	}

	// Word count gate — fewer than 150 words is considered thin
	words := strings.Fields(desc)
	return len(words) < 150
}

// Scraper defines the interface for different job board crawlers
type Scraper interface {
	Name() string
	Crawl() ([]shared.Job, error)
}

// Engine manages the execution of multiple scrapers (jobs and news)
type Engine struct {
	scrapers     []Scraper
	newsScrapers []NewsScraper
	db           *DB
	aiService    *AIService
	jobsAdded    int64
	newsAdded    int64
}

func NewEngine(db *DB, aiService *AIService) *Engine {
	return &Engine{
		scrapers:     []Scraper{},
		newsScrapers: []NewsScraper{},
		db:           db,
		aiService:    aiService,
		jobsAdded:    0,
		newsAdded:    0,
	}
}


func (e *Engine) AddScraper(s Scraper) {
	e.scrapers = append(e.scrapers, s)
}

func (e *Engine) AddNewsScraper(ns NewsScraper) {
	e.newsScrapers = append(e.newsScrapers, ns)
}

func (e *Engine) Run() {
	runID := os.Getenv("GITHUB_RUN_ID")
	runNumberStr := os.Getenv("GITHUB_RUN_NUMBER")

	if runID == "" {
		runID = fmt.Sprintf("local-%d", time.Now().Unix())
	}

	var runNumber int
	if runNumberStr != "" {
		fmt.Sscanf(runNumberStr, "%d", &runNumber)
	} else {
		var err error
		runNumber, err = e.db.GetNextLocalRunNumber()
		if err != nil {
			log.Printf("Warning: failed to get next local run number: %v", err)
			runNumber = 1
		}
	}

	// Fetch admin-controlled scraper settings
	settings, err := e.db.GetScraperSettings()
	if err != nil {
		log.Printf("[Settings] Warning: could not fetch settings, using defaults: %v", err)
	}
	enableJobs := settings["enable_job_scraping"] != "false"
	enableArticles := settings["enable_article_scraping"] != "false"
	articleAuthor := settings["article_author"]
	seoFormat := settings["article_seo_format"] != "false"

	log.Printf("[Settings] Jobs=%v | Articles=%v | Author=%q | SEO Format=%v",
		enableJobs, enableArticles, articleAuthor, seoFormat)

	// Create run log in database
	err = e.db.CreateScraperRun(runID, runNumber)
	if err != nil {
		log.Printf("Error creating scraper run in DB: %v", err)
	}

	status := "success"
	errMsg := ""
	defer func() {
		if r := recover(); r != nil {
			status = "failed"
			errMsg = fmt.Sprintf("Panic: %v", r)
			_ = e.db.UpdateScraperRun(runID, int(atomic.LoadInt64(&e.jobsAdded)), int(atomic.LoadInt64(&e.newsAdded)), status, errMsg)
			panic(r)
		}
	}()

	var wg sync.WaitGroup
	jobChan := make(chan shared.Job, 200)
	newsChan := make(chan shared.News, 100)

	// Start job scrapers concurrently (only if enabled in admin settings)
	if enableJobs {
		for _, s := range e.scrapers {
			wg.Add(1)
			go func(sc Scraper) {
				defer wg.Done()
				log.Printf("Starting job scraper: %s", sc.Name())
				jobs, err := sc.Crawl()
				if err != nil {
					log.Printf("Error in job scraper %s: %v", sc.Name(), err)
					return
				}
				for _, job := range jobs {
					jobChan <- job
				}
			}(s)
		}
	} else {
		log.Printf("[Settings] ⏸️  Job scraping is DISABLED by admin settings. Skipping all job scrapers.")
	}

	// Start news scrapers concurrently (only if enabled in admin settings)
	if enableArticles {
		for _, ns := range e.newsScrapers {
			wg.Add(1)
			go func(nsc NewsScraper) {
				defer wg.Done()
				log.Printf("Starting news scraper: %s", nsc.Name())
				articles, err := nsc.CrawlNews()
				if err != nil {
					log.Printf("Error in news scraper %s: %v", nsc.Name(), err)
					return
				}
				// Only take the first 10 articles per RSS feed to keep runs fast and avoid API key exhaustion
				limit := 10
				if len(articles) < limit {
					limit = len(articles)
				}
				for i := 0; i < limit; i++ {
					newsChan <- articles[i]
				}
			}(ns)
		}
	} else {
		log.Printf("[Settings] ⏸️  Article scraping is DISABLED by admin settings. Skipping all news scrapers.")
	}

	// Closer goroutine — signals both channels when all scrapers finish fetching
	go func() {
		wg.Wait()
		close(jobChan)
		close(newsChan)
	}()

	// Process jobs and news CONCURRENTLY in separate goroutines
	// This prevents slow news AI calls from blocking job saves
	var processingWg sync.WaitGroup

	// Goroutine 1: Process all job listings in BATCHES
	processingWg.Add(1)
	go func() {
		defer processingWg.Done()
		const maxJobsToProcess = 30
		processedCount := 0
		var batch []*shared.Job
		for job := range jobChan {
			// 1. Deduplicate — check if URL already exists in DB
			if job.URL != "" {
				exists, err := e.db.JobURLExists(job.URL)
				if err == nil && exists {
					log.Printf("[Dedup] Skipping duplicate: %s (%s)", job.Title, job.URL)
					continue
				}
			}

			// 2. Pre-AI Thin Content Filter — skip before wasting Gemini quota
			if len(strings.TrimSpace(job.Description)) < minRawDescriptionLength {
				log.Printf("[ThinContent] ⛔ Skipping '%s' @ %s — description too short", job.Title, job.Company)
				continue
			}

			// 3. Rate-limiting processing to avoid GitHub Actions timeout and Gemini API exhaustion
			if processedCount >= maxJobsToProcess {
				log.Printf("[Limit] ⏸️ Reached maximum job limit (%d) for this run. Skipping AI optimization for: %s", maxJobsToProcess, job.Title)
				continue
			}

			// Capture loop variable correctly
			j := job
			batch = append(batch, &j)
			processedCount++

			if len(batch) >= 5 {
				e.processJobBatch(batch)
				batch = nil
			}
		}
		// Process remaining
		if len(batch) > 0 {
			e.processJobBatch(batch)
		}
	}()

	// Goroutine 2: Process all news articles in BATCHES
	processingWg.Add(1)
	go func() {
		defer processingWg.Done()
		const maxNewsToProcess = 5
		processedCount := 0
		var batch []*shared.News
		for art := range newsChan {
			// Deduplicate
			art.GenerateSlug()
			if existing, _ := e.db.GetNewsBySlug(art.Slug); existing.ID > 0 {
				log.Printf("[News] Skipping already-indexed article: %s", art.Title)
				continue
			}

			// Rate-limiting processing to avoid GitHub Actions timeout and Gemini API exhaustion
			if processedCount >= maxNewsToProcess {
				log.Printf("[Limit] ⏸️ Reached maximum news limit (%d) for this run. Skipping AI optimization for: %s", maxNewsToProcess, art.Title)
				continue
			}

			a := art
			batch = append(batch, &a)
			processedCount++

			if len(batch) >= 5 {
				e.processNewsBatch(batch, articleAuthor, seoFormat)
				batch = nil
			}
		}
		if len(batch) > 0 {
			e.processNewsBatch(batch, articleAuthor, seoFormat)
		}
	}()

	// Wait for both processing pipelines to complete
	processingWg.Wait()

	// Run automated article generation pipeline — 2 articles × 4 runs/day = 8 articles/day
	if enableArticles {
		e.GenerateAndSaveDailyArticles(2, articleAuthor, seoFormat)
	} else {
		log.Printf("[Settings] ⏸️  Skipping daily article generation (articles disabled).")
	}

	// Update the scraper run log in the DB
	err = e.db.UpdateScraperRun(runID, int(atomic.LoadInt64(&e.jobsAdded)), int(atomic.LoadInt64(&e.newsAdded)), status, errMsg)
	if err != nil {
		log.Printf("Error updating scraper run in DB: %v", err)
	}
}

func (e *Engine) processJobBatch(jobs []*shared.Job) {
	// 2. Gemini AI Rewrite — MANDATORY for all new jobs
	// "No Gemini, No Post" rule: if AI fails, we skip the batch entirely
	if e.aiService != nil {
		err := e.aiService.OptimizeJobsBatch(jobs)
		if err != nil {
			log.Printf("[AI] ❌ Gemini batch rewrite failed — SKIPPING %d jobs (No Gemini, No Post): %v", len(jobs), err)
			return // Do NOT save raw scraped content
		}
	} else {
		log.Printf("[AI] ⚠️ No AI service configured — skipping %d jobs (No Gemini, No Post rule)", len(jobs))
		return // Do NOT save without AI rewrite
	}

	// 3. Save Gemini-rewritten jobs to Database (with thin content filter)
	for _, j := range jobs {
		// Thin Content Gate: skip jobs where AI rewrite produced insufficient content.
		// This prevents low-quality pages from harming SEO and AdSense approval.
		if isThinContent(j.Description) {
			log.Printf("[Quality] ⛔ Skipping thin-content job (< 150 words or missing info): [%s] at %s", j.Title, j.Company)
			continue
		}

		jobID, err := e.db.SaveJob(*j)
		if err != nil {
			log.Printf("Error saving job from %s: %v", j.Source, err)
			continue
		}
		atomic.AddInt64(&e.jobsAdded, 1)

		log.Printf("✅ Saved job: [%s] at %s from %s", j.Title, j.Company, j.Source)

		// 4. Notify Google Indexing API of the new/updated job URL
		go func(id int64, title string, company string) {
			slug := Slugify(fmt.Sprintf("%s %s", title, company))
			jobURL := fmt.Sprintf("https://www.futuretalent.online/jobs/%d-%s", id, slug)
			if err := NotifyGoogleIndexing(jobURL, "URL_UPDATED"); err != nil {
				log.Printf("[Indexing] ⚠️ Google Indexing API update failed for %s: %v", jobURL, err)
			}
		}(jobID, j.Title, j.Company)
	}
}

func (e *Engine) processNewsBatch(articles []*shared.News, authorOverride string, seoFormat bool) {
	// 1. AI Content Optimization (with optional SEO heading enforcement)
	if e.aiService != nil {
		err := e.aiService.OptimizeNewsBatch(articles, seoFormat)
		if err != nil {
			log.Printf("[AI] ❌ AI Optimization failed for batch of %d news articles: %v", len(articles), err)
			return // Don't save unoptimized news
		}
	} else {
		return
	}

	// 2. Save to Database (with author override from admin settings)
	for _, art := range articles {
		// Override author with admin-configured value
		if authorOverride != "" {
			art.Author = authorOverride
		}

		err := e.db.SaveNews(*art)
		if err != nil {
			log.Printf("Error saving news article %s: %v", art.Title, err)
			continue
		}
		atomic.AddInt64(&e.newsAdded, 1)
		log.Printf("Saved news article: [%s] Category: %s from %s", art.Title, art.Category, art.Author)
	}
}

// GenerateAndSaveDailyArticles fetches context from recent jobs and writes totally unique articles via AI
func (e *Engine) GenerateAndSaveDailyArticles(count int, authorOverride string, seoFormat bool) {
	if e.aiService == nil {
		return
	}

	log.Printf("Starting autonomous article generation pipeline (%d articles)...", count)
	
	// 1. Get recent jobs as context
	jobsCtx, err := e.db.GetRecentJobsForContext(10) // fetch up to 10 jobs for context
	if err != nil {
		log.Printf("Error fetching job context for articles: %v", err)
		// Even if context fails, we can still generate generic articles
	}

	// 2. Generate articles (with SEO format flag)
	articles, err := e.aiService.GenerateOriginalArticles(jobsCtx, count, seoFormat)
	if err != nil {
		log.Printf("Error generating original AI articles: %v", err)
		return
	}

	// 3. Save to database (with author override from admin settings)
	for _, art := range articles {
		if authorOverride != "" {
			art.Author = authorOverride
		}

		err := e.db.SaveNews(art)
		if err != nil {
			log.Printf("Error saving AI-generated article %s: %v", art.Title, err)
			continue
		}
		atomic.AddInt64(&e.newsAdded, 1)
		log.Printf("✅ Published Original AI Article: [%s] Category: %s by %s", art.Title, art.Category, art.Author)
	}
}
