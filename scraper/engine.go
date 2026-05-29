package scraper

import (
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"sync"
)

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
}

func NewEngine(db *DB, aiService *AIService) *Engine {
	return &Engine{
		scrapers:     []Scraper{},
		newsScrapers: []NewsScraper{},
		db:           db,
		aiService:    aiService,
	}
}

func (e *Engine) AddScraper(s Scraper) {
	e.scrapers = append(e.scrapers, s)
}

func (e *Engine) AddNewsScraper(ns NewsScraper) {
	e.newsScrapers = append(e.newsScrapers, ns)
}

func (e *Engine) Run() {
	var wg sync.WaitGroup
	jobChan := make(chan shared.Job, 200)
	newsChan := make(chan shared.News, 100)

	// Start job scrapers concurrently
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

	// Start news scrapers concurrently
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

			// Capture loop variable correctly
			j := job
			batch = append(batch, &j)

			if len(batch) >= 10 {
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
		var batch []*shared.News
		for art := range newsChan {
			// Deduplicate
			art.GenerateSlug()
			if existing, _ := e.db.GetNewsBySlug(art.Slug); existing.ID > 0 {
				log.Printf("[News] Skipping already-indexed article: %s", art.Title)
				continue
			}

			a := art
			batch = append(batch, &a)

			if len(batch) >= 5 {
				e.processNewsBatch(batch)
				batch = nil
			}
		}
		if len(batch) > 0 {
			e.processNewsBatch(batch)
		}
	}()

	// Wait for both processing pipelines to complete
	processingWg.Wait()
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

	// 3. Save Gemini-rewritten jobs to Database
	for _, j := range jobs {
		jobID, err := e.db.SaveJob(*j)
		if err != nil {
			log.Printf("Error saving job from %s: %v", j.Source, err)
			continue
		}

		log.Printf("✅ Saved job: [%s] at %s from %s", j.Title, j.Company, j.Source)

		// 4. Notify Google Indexing API of the new/updated job URL
		go func(id int64, title string, company string) {
			slug := Slugify(fmt.Sprintf("%s %s", title, company))
			jobURL := fmt.Sprintf("https://futuretalent.com/jobs/%d-%s", id, slug)
			if err := NotifyGoogleIndexing(jobURL, "URL_UPDATED"); err != nil {
				log.Printf("[Indexing] ⚠️ Google Indexing API update failed for %s: %v", jobURL, err)
			}
		}(jobID, j.Title, j.Company)
	}
}

func (e *Engine) processNewsBatch(articles []*shared.News) {
	// 1. AI Content Optimization
	if e.aiService != nil {
		err := e.aiService.OptimizeNewsBatch(articles)
		if err != nil {
			log.Printf("[AI] ❌ AI Optimization failed for batch of %d news articles: %v", len(articles), err)
			return // Don't save unoptimized news
		}
	} else {
		return
	}

	// 2. Save to Database
	for _, art := range articles {
		err := e.db.SaveNews(*art)
		if err != nil {
			log.Printf("Error saving news article %s: %v", art.Title, err)
			continue
		}
		log.Printf("Saved news article: [%s] Category: %s from %s", art.Title, art.Category, art.Author)
	}
}
