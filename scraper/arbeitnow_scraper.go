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

type ArbeitnowScraper struct {
	apiURL string
}

func NewArbeitnowScraper() *ArbeitnowScraper {
	return &ArbeitnowScraper{
		apiURL: "https://www.arbeitnow.com/api/job-board-api",
	}
}

func (a *ArbeitnowScraper) Name() string {
	return "Arbeitnow"
}

// arbeitnowJob represents the JSON structure returned by the Arbeitnow API
type arbeitnowJob struct {
	Slug        string   `json:"slug"`
	CompanyName string   `json:"company_name"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Remote      bool     `json:"remote"`
	URL         string   `json:"url"`
	Tags        []string `json:"tags"`
	JobTypes    []string `json:"job_types"`
	Location    string   `json:"location"`
	CreatedAt   int64    `json:"created_at"`
}

type arbeitnowResponse struct {
	Data  []arbeitnowJob `json:"data"`
	Links struct {
		Next string `json:"next"`
	} `json:"links"`
	Meta struct {
		CurrentPage int `json:"current_page"`
		LastPage    int `json:"last_page"`
	} `json:"meta"`
}

func (a *ArbeitnowScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	var allJobs []shared.Job
	url := a.apiURL

	// Fetch up to 3 pages to get a good batch of jobs
	for page := 0; page < 3 && url != ""; page++ {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")
		req.Header.Set("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[Arbeitnow] Failed to fetch page %d: %v", page+1, err)
			break
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			log.Printf("[Arbeitnow] API returned status %d on page %d", resp.StatusCode, page+1)
			break
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("[Arbeitnow] Failed to read body on page %d: %v", page+1, err)
			break
		}

		var apiResp arbeitnowResponse
		if err := json.Unmarshal(body, &apiResp); err != nil {
			log.Printf("[Arbeitnow] Failed to parse JSON on page %d: %v", page+1, err)
			break
		}

		for _, aj := range apiResp.Data {
			// Only include remote jobs
			if !aj.Remote {
				continue
			}

			if aj.Title == "" || aj.URL == "" {
				continue
			}

			location := aj.Location
			if location == "" {
				location = "Remote Worldwide"
			}

			remoteType := "worldwide"
			locLower := strings.ToLower(location)
			if strings.Contains(locLower, "germany") || strings.Contains(locLower, "usa") ||
				strings.Contains(locLower, "europe") || strings.Contains(locLower, "uk") ||
				strings.Contains(locLower, "us") {
				remoteType = "country"
			}

			category := CategorizeJob(aj.Title, aj.Tags, "")

			postedAt := time.Now()
			if aj.CreatedAt > 0 {
				postedAt = time.Unix(aj.CreatedAt, 0)
			}

			// Clean HTML from description
			desc := aj.Description
			desc = strings.ReplaceAll(desc, "<br>", "\n")
			desc = strings.ReplaceAll(desc, "<br/>", "\n")
			desc = strings.ReplaceAll(desc, "</p>", "\n")
			desc = strings.ReplaceAll(desc, "</li>", "\n")

			job := shared.Job{
				Title:       aj.Title,
				Company:     aj.CompanyName,
				Location:    location,
				Description: desc,
				Source:      a.Name(),
				URL:         aj.URL,
				RemoteType:  remoteType,
				Category:    category,
				Tags:        aj.Tags,
				PostedAt:    postedAt,
			}
			job.SetExpiration()
			allJobs = append(allJobs, job)
		}

		// Move to next page
		url = apiResp.Links.Next
	}

	log.Printf("[Arbeitnow] Fetched %d remote jobs", len(allJobs))
	return allJobs, nil
}
