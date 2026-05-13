package scraper

import (
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"time"

	"github.com/gocolly/colly/v2"
)

type WWRScraper struct {
	baseURL string
}

func NewWWRScraper() *WWRScraper {
	return &WWRScraper{
		baseURL: "https://weworkremotely.com/remote-jobs/search?term=Remote",
	}
}

func (w *WWRScraper) Name() string {
	return "We Work Remotely"
}

func (w *WWRScraper) Crawl() ([]shared.Job, error) {
	var jobs []shared.Job
	c := colly.NewCollector(
		colly.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"),
	)

	// Set timeouts
	c.SetRequestTimeout(30 * time.Second)

	c.OnHTML("section.jobs article ul li", func(e *colly.HTMLElement) {
		// Only get elements that look like job listings
		title := e.ChildText("span.title")
		if title == "" {
			return
		}

		company := e.ChildText("span.company")
		location := e.ChildText("span.region")
		jobURL := e.ChildAttr("a[href^='/remote-jobs/']", "href")

		if jobURL != "" {
			fullURL := e.Request.AbsoluteURL(jobURL)
			job := shared.Job{
				Title:    title,
				Company:  company,
				Location: location,
				Source:   w.Name(),
				URL:      fullURL,
				PostedAt: time.Now(), // WWR doesn't always show precise time in the list
			}
			jobs = append(jobs, job)
		}
	})

	c.OnRequest(func(r *colly.Request) {
		log.Printf("Visiting %s", r.URL)
	})

	c.OnError(func(r *colly.Response, err error) {
		log.Printf("Request URL: %s failed with response: %v\nError: %v", r.Request.URL, r, err)
	})

	err := c.Visit(w.baseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to visit WWR: %w", err)
	}

	return jobs, nil
}
