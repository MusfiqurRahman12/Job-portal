package scraper

import (
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"strings"
	"time"
)

type FindWorkScraper struct {
	apiURL string
}

func NewFindWorkScraper() *FindWorkScraper {
	return &FindWorkScraper{
		apiURL: "https://findwork.dev/api/jobs/",
	}
}

func (f *FindWorkScraper) Name() string {
	return "FindWork"
}

// findworkJob represents the JSON structure returned by FindWork.dev API
type findworkJob struct {
	ID          int      `json:"id"`
	Role        string   `json:"role"`
	CompanyName string   `json:"company_name"`
	CompanyNum  int      `json:"company_num_employees"`
	Employment  string   `json:"employment_type"`
	Location    string   `json:"location"`
	IsRemote    bool     `json:"remote"`
	Logo        string   `json:"logo"`
	URL         string   `json:"url"`
	Text        string   `json:"text"`
	DatePosted  string   `json:"date_posted"`
	Keywords    []string `json:"keywords"`
	Source      string   `json:"source"`
}

type findworkResponse struct {
	Count   int           `json:"count"`
	Next    string        `json:"next"`
	Results []findworkJob `json:"results"`
}

func (f *FindWorkScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	var allJobs []shared.Job
	url := f.apiURL

	// Fetch up to 3 pages
	for page := 0; page < 3 && url != ""; page++ {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[FindWork] Failed to fetch page %d: %v", page+1, err)
			break
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			log.Printf("[FindWork] API returned status %d on page %d", resp.StatusCode, page+1)
			break
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("[FindWork] Failed to read body on page %d: %v", page+1, err)
			break
		}

		var apiResp findworkResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			log.Printf("[FindWork] Failed to parse JSON on page %d: %v", page+1, err)
			break
		}

		for _, fj := range apiResp.Results {
			if fj.Role == "" || fj.URL == "" {
				continue
			}

			location := fj.Location
			if location == "" {
				if fj.IsRemote {
					location = "Remote Worldwide"
				} else {
					location = "Location Not Specified"
				}
			}

			// Determine workplace type
			workplaceType := "onsite"
			if fj.IsRemote {
				workplaceType = shared.DetectWorkplaceType(fj.Role, location, fj.Text)
				if workplaceType == "onsite" {
					workplaceType = "remote" // Remote flag overrides
				}
			} else {
				workplaceType = shared.DetectWorkplaceType(fj.Role, location, fj.Text)
			}

			remoteType := "worldwide"
			if workplaceType == "onsite" {
				remoteType = "country"
			} else {
				locLower := strings.ToLower(location)
				if strings.Contains(locLower, "usa") || strings.Contains(locLower, "us ") ||
					strings.Contains(locLower, "europe") || strings.Contains(locLower, "uk") ||
					strings.Contains(locLower, "germany") || strings.Contains(locLower, "canada") {
					remoteType = "country"
				}
			}

			category := CategorizeJob(fj.Role, fj.Keywords, "")

			postedAt := time.Now()
			if fj.DatePosted != "" {
				if parsed, err := time.Parse("2006-01-02T15:04:05Z", fj.DatePosted); err == nil {
					postedAt = parsed
				} else if parsed, err := time.Parse("2006-01-02", fj.DatePosted); err == nil {
					postedAt = parsed
				}
			}

			// Clean HTML from description
			desc := fj.Text
			desc = strings.ReplaceAll(desc, "<br>", "\n")
			desc = strings.ReplaceAll(desc, "<br/>", "\n")
			desc = strings.ReplaceAll(desc, "<br />", "\n")
			desc = strings.ReplaceAll(desc, "</p>", "\n")
			desc = strings.ReplaceAll(desc, "</li>", "\n")

			job := shared.Job{
				Title:         fj.Role,
				Company:       fj.CompanyName,
				CompanyLogo:   fj.Logo,
				Location:      location,
				Description:   desc,
				Source:        f.Name(),
				URL:           fj.URL,
				RemoteType:    remoteType,
				WorkplaceType: workplaceType,
				Category:      category,
				Tags:          fj.Keywords,
				PostedAt:      postedAt,
			}
			job.SetExpiration()
			allJobs = append(allJobs, job)
		}

		// Move to next page
		url = apiResp.Next
	}

	log.Printf("[FindWork] Fetched %d jobs (remote + hybrid + onsite)", len(allJobs))
	return allJobs, nil
}
