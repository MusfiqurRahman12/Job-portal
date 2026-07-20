package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type TheMuseScraper struct {
	apiURL string
}

func NewTheMuseScraper() *TheMuseScraper {
	return &TheMuseScraper{
		apiURL: "https://www.themuse.com/api/public/jobs",
	}
}

func (s *TheMuseScraper) Name() string {
	return "TheMuse API"
}

type museJobResponse struct {
	Page      int           `json:"page"`
	PageCount int           `json:"page_count"`
	Total     int           `json:"total"`
	Results   []museJobItem `json:"results"`
}

type museJobItem struct {
	ID              int            `json:"id"`
	Name            string         `json:"name"`
	Contents        string         `json:"contents"`
	PublicationDate string         `json:"publication_date"`
	Locations       []museLocation `json:"locations"`
	Categories      []museCategory `json:"categories"`
	Refs            struct {
		LandingPage string `json:"landing_page"`
	} `json:"refs"`
	Company struct {
		Name string `json:"name"`
	} `json:"company"`
}

type museLocation struct {
	Name string `json:"name"`
}

type museCategory struct {
	Name string `json:"name"`
}

func (s *TheMuseScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	var jobs []shared.Job

	// Fetch 3 pages of remote jobs (20 jobs per page = 60 jobs)
	pagesToFetch := 3
	for page := 1; page <= pagesToFetch; page++ {
		queryURL := fmt.Sprintf("%s?page=%d&location=Flexible%%20%%2F%%20Remote&descending=true", s.apiURL, page)
		
		req, err := http.NewRequest("GET", queryURL, nil)
		if err != nil {
			log.Printf("[TheMuse] Error creating request for page %d: %v", page, err)
			continue
		}
		req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[TheMuse] Error calling page %d: %v", page, err)
			continue
		}
		
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("[TheMuse] Error reading response for page %d: %v", page, err)
			continue
		}

		if resp.StatusCode != 200 {
			log.Printf("[TheMuse] Page %d returned non-200 code: %d", page, resp.StatusCode)
			continue
		}

		var apiResp museJobResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			log.Printf("[TheMuse] Error parsing JSON for page %d: %v", page, err)
			continue
		}

		for _, item := range apiResp.Results {
			if item.Name == "" || item.Refs.LandingPage == "" {
				continue
			}

			// Clean description HTML
			desc := item.Contents
			desc = strings.ReplaceAll(desc, "<br>", "\n")
			desc = strings.ReplaceAll(desc, "<br/>", "\n")
			desc = strings.ReplaceAll(desc, "<br />", "\n")
			desc = strings.ReplaceAll(desc, "</p>", "\n")
			desc = strings.ReplaceAll(desc, "</li>", "\n")

			location := "Remote"
			if len(item.Locations) > 0 {
				location = item.Locations[0].Name
			}

			categoryName := ""
			if len(item.Categories) > 0 {
				categoryName = item.Categories[0].Name
			}
			category := CategorizeJob(item.Name, nil, categoryName)

			// Try parsing publication date
			postedAt := time.Now()
			if item.PublicationDate != "" {
				if parsed, err := time.Parse(time.RFC3339, item.PublicationDate); err == nil {
					postedAt = parsed
				} else if parsed, err := time.Parse("2006-01-02T15:04:05Z", item.PublicationDate); err == nil {
					postedAt = parsed
				}
			}

			// Remote details
			remoteType := "worldwide"
			if !strings.Contains(strings.ToLower(location), "remote") && !strings.Contains(strings.ToLower(location), "flexible") {
				remoteType = "country"
			}
			workplaceType := shared.DetectWorkplaceType(item.Name, location, desc)

			// Format job URL properly (avoid double query encoding or issues)
			jobURL := item.Refs.LandingPage
			if u, err := url.Parse(jobURL); err == nil {
				jobURL = u.String()
			}

			job := shared.Job{
				Title:         item.Name,
				Company:       item.Company.Name,
				Location:      location,
				Description:   desc,
				Source:        s.Name(),
				URL:           jobURL,
				RemoteType:    remoteType,
				WorkplaceType: workplaceType,
				Category:      category,
				PostedAt:      postedAt,
			}
			job.SetExpiration()
			jobs = append(jobs, job)
		}
		
		// Tiny polite rate-limit delay
		time.Sleep(500 * time.Millisecond)
	}

	log.Printf("[TheMuse API] Fetched %d jobs successfully", len(jobs))
	return jobs, nil
}
