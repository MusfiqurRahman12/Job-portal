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

// Engine manages the execution of multiple scrapers
type Engine struct {
	scrapers  []Scraper
	db        *DB
	aiService *AIService
}

func NewEngine(db *DB, aiService *AIService) *Engine {
	return &Engine{
		scrapers:  []Scraper{},
		db:        db,
		aiService: aiService,
	}
}

func (e *Engine) AddScraper(s Scraper) {
	e.scrapers = append(e.scrapers, s)
}

func (e *Engine) Run() {
	var wg sync.WaitGroup
	jobChan := make(chan shared.Job, 100)

	// Start scrapers concurrently
	for _, s := range e.scrapers {
		wg.Add(1)
		go func(sc Scraper) {
			defer wg.Done()
			log.Printf("Starting scraper: %s", sc.Name())
			jobs, err := sc.Crawl()
			if err != nil {
				log.Printf("Error in scraper %s: %v", sc.Name(), err)
				return
			}
			for _, job := range jobs {
				jobChan <- job
			}
		}(s)
	}

	// Closer goroutine
	go func() {
		wg.Wait()
		close(jobChan)
	}()

	// Job processor
	for job := range jobChan {
		e.processJob(job)
	}
}

func (e *Engine) processJob(job shared.Job) {
	// 1. AI Content Optimization
	if e.aiService != nil {
		err := e.aiService.OptimizeJob(&job)
		if err != nil {
			log.Printf("AI Optimization failed for %s: %v", job.Title, err)
		}
	}

	// 2. Save to Database
	err := e.db.SaveJob(job)
	if err != nil {
		log.Printf("Error saving job from %s: %v", job.Source, err)
		return
	}

	log.Printf("Saved job: [%s] at %s from %s", job.Title, job.Company, job.Source)
}
