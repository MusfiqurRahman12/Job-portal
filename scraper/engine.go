package scraper

import (
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

	// Goroutine 1: Process all job listings
	// Pipeline: Scrape → Deduplicate → Gemini Rewrite → Save
	// RULE: No Gemini, No Post — raw scraped content is NEVER saved
	processingWg.Add(1)
	go func() {
		defer processingWg.Done()
		for job := range jobChan {
			e.processJob(job)
		}
	}()

	// Goroutine 2: Process all news articles (with AI if quota available, skip if already in DB)
	processingWg.Add(1)
	go func() {
		defer processingWg.Done()
		for art := range newsChan {
			e.processNews(art)
		}
	}()

	// Wait for both processing pipelines to complete
	processingWg.Wait()
}

func (e *Engine) processJob(job shared.Job) {
	// 1. Deduplicate — check if URL already exists in DB (skip before AI to save quota)
	if job.URL != "" {
		exists, err := e.db.JobURLExists(job.URL)
		if err != nil {
			log.Printf("[Dedup] Error checking URL for %s: %v", job.Title, err)
			// On error, proceed cautiously — try to save anyway
		} else if exists {
			log.Printf("[Dedup] Skipping duplicate: %s (%s)", job.Title, job.URL)
			return
		}
	}

	// 2. Gemini AI Rewrite — MANDATORY for all new jobs
	// "No Gemini, No Post" rule: if AI fails, we skip the job entirely
	if e.aiService != nil {
		err := e.aiService.OptimizeJob(&job)
		if err != nil {
			log.Printf("[AI] ❌ Gemini rewrite failed for [%s] at %s — SKIPPING (No Gemini, No Post): %v", job.Title, job.Company, err)
			return // Do NOT save raw scraped content
		}
	} else {
		log.Printf("[AI] ⚠️ No AI service configured — skipping job: %s (No Gemini, No Post rule)", job.Title)
		return // Do NOT save without AI rewrite
	}

	// 3. Save Gemini-rewritten job to Database
	err := e.db.SaveJob(job)
	if err != nil {
		log.Printf("Error saving job from %s: %v", job.Source, err)
		return
	}

	log.Printf("✅ Saved job: [%s] at %s from %s", job.Title, job.Company, job.Source)
}

func (e *Engine) processNews(art shared.News) {
	// Skip AI optimization if article already exists in DB (avoids burning quota on duplicates)
	art.GenerateSlug()
	if existing, _ := e.db.GetNewsBySlug(art.Slug); existing.ID > 0 {
		log.Printf("[News] Skipping already-indexed article: %s", art.Title)
		return
	}

	// 1. AI Content Optimization (re-writing, category mapping, excerpts)
	if e.aiService != nil {
		err := e.aiService.OptimizeNews(&art)
		if err != nil {
			log.Printf("AI Optimization failed for news article %s: %v", art.Title, err)
			return // Don't save unoptimized news — it needs AI rewriting for quality
		}
	}

	// 2. Save to Database
	err := e.db.SaveNews(art)
	if err != nil {
		log.Printf("Error saving news article %s: %v", art.Title, err)
		return
	}

	log.Printf("Saved news article: [%s] Category: %s from %s", art.Title, art.Category, art.Author)
}
