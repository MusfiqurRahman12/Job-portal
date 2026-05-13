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

type RemoteOKScraper struct {
	apiURL string
}

func NewRemoteOKScraper() *RemoteOKScraper {
	return &RemoteOKScraper{
		apiURL: "https://remoteok.com/api",
	}
}

func (r *RemoteOKScraper) Name() string {
	return "RemoteOK"
}

// remoteOKJob represents the JSON structure returned by RemoteOK's API
type remoteOKJob struct {
	Slug        string   `json:"slug"`
	ID          string   `json:"id"`
	Epoch       string   `json:"epoch"`
	Date        string   `json:"date"`
	Company     string   `json:"company"`
	CompanyLogo string   `json:"company_logo"`
	Position    string   `json:"position"`
	Tags        []string `json:"tags"`
	Description string   `json:"description"`
	Location    string   `json:"location"`
	SalaryMin   int      `json:"salary_min"`
	SalaryMax   int      `json:"salary_max"`
	URL         string   `json:"url"`
}

func (r *RemoteOKScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", r.apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "RemoteHub Job Aggregator/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RemoteOK API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var rawJobs []remoteOKJob
	if err := json.Unmarshal(body, &rawJobs); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	var jobs []shared.Job
	for i, rj := range rawJobs {
		// Skip the first element (it's a metadata/legal notice object)
		if i == 0 || rj.Position == "" {
			continue
		}

		salary := ""
		if rj.SalaryMin > 0 && rj.SalaryMax > 0 {
			salary = fmt.Sprintf("$%dk – $%dk", rj.SalaryMin/1000, rj.SalaryMax/1000)
		}

		location := rj.Location
		if location == "" {
			location = "Remote Worldwide"
		}

		remoteType := "worldwide"
		locLower := strings.ToLower(location)
		if strings.Contains(locLower, "us") || strings.Contains(locLower, "eu") || strings.Contains(locLower, "uk") {
			remoteType = "country"
		}

		category := categorizeByTags(rj.Tags)

		jobURL := rj.URL
		if jobURL == "" {
			jobURL = fmt.Sprintf("https://remoteok.com/remote-jobs/%s", rj.Slug)
		}

		postedAt := time.Now()
		if rj.Date != "" {
			if parsed, err := time.Parse("2006-01-02T15:04:05-07:00", rj.Date); err == nil {
				postedAt = parsed
			}
		}

		job := shared.Job{
			Title:       rj.Position,
			Company:     rj.Company,
			CompanyLogo: rj.CompanyLogo,
			Location:    location,
			Description: rj.Description,
			Source:      r.Name(),
			URL:         jobURL,
			RemoteType:  remoteType,
			Category:    category,
			Tags:        rj.Tags,
			Salary:      salary,
			PostedAt:    postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[RemoteOK] Fetched %d jobs", len(jobs))
	return jobs, nil
}

// categorizeByTags determines a job category based on its tags
func categorizeByTags(tags []string) string {
	tagStr := strings.ToLower(strings.Join(tags, " "))

	switch {
	case strings.Contains(tagStr, "design") || strings.Contains(tagStr, "figma") || strings.Contains(tagStr, "ux"):
		return "Design"
	case strings.Contains(tagStr, "marketing") || strings.Contains(tagStr, "seo") || strings.Contains(tagStr, "growth"):
		return "Marketing"
	case strings.Contains(tagStr, "data") || strings.Contains(tagStr, "machine learning") || strings.Contains(tagStr, "ai"):
		return "Data Science"
	case strings.Contains(tagStr, "devops") || strings.Contains(tagStr, "sre") || strings.Contains(tagStr, "infrastructure"):
		return "DevOps"
	case strings.Contains(tagStr, "product") || strings.Contains(tagStr, "manager"):
		return "Product"
	default:
		return "Engineering"
	}
}
