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

type RemotiveScraper struct {
	apiURL string
}

func NewRemotiveScraper() *RemotiveScraper {
	return &RemotiveScraper{
		apiURL: "https://remotive.com/api/remote-jobs",
	}
}

func (r *RemotiveScraper) Name() string {
	return "Remotive"
}

// remotiveJob represents the JSON structure returned by the Remotive API
type remotiveJob struct {
	ID             int      `json:"id"`
	URL            string   `json:"url"`
	Title          string   `json:"title"`
	CompanyName    string   `json:"company_name"`
	CompanyLogo    string   `json:"company_logo_url"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	JobType        string   `json:"job_type"`
	PublicationDate string  `json:"publication_date"`
	CandidateReqLoc string `json:"candidate_required_location"`
	Salary          string  `json:"salary"`
	Description     string  `json:"description"`
}

type remotiveResponse struct {
	JobCount int           `json:"job-count"`
	Jobs     []remotiveJob `json:"jobs"`
}

func (r *RemotiveScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", r.apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Remotive API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("remotive API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var apiResp remotiveResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	var jobs []shared.Job
	for _, rj := range apiResp.Jobs {
		if rj.Title == "" || rj.URL == "" {
			continue
		}

		location := rj.CandidateReqLoc
		if location == "" {
			location = "Remote Worldwide"
		}

		remoteType := "worldwide"
		locLower := strings.ToLower(location)
		if strings.Contains(locLower, "usa") || strings.Contains(locLower, "us only") ||
			strings.Contains(locLower, "europe") || strings.Contains(locLower, "uk") {
			remoteType = "country"
		}

		category := mapRemotiveCategory(rj.Category)

		postedAt := time.Now()
		if rj.PublicationDate != "" {
			// Remotive uses ISO 8601 format
			if parsed, err := time.Parse("2006-01-02T15:04:05", rj.PublicationDate); err == nil {
				postedAt = parsed
			}
		}

		// Clean HTML from description
		desc := rj.Description
		desc = strings.ReplaceAll(desc, "<br>", "\n")
		desc = strings.ReplaceAll(desc, "<br/>", "\n")
		desc = strings.ReplaceAll(desc, "<br />", "\n")
		desc = strings.ReplaceAll(desc, "</p>", "\n")
		desc = strings.ReplaceAll(desc, "</li>", "\n")

		job := shared.Job{
			Title:       rj.Title,
			Company:     rj.CompanyName,
			CompanyLogo: rj.CompanyLogo,
			Location:    location,
			Description: desc,
			Source:      r.Name(),
			URL:         rj.URL,
			RemoteType:  remoteType,
			Category:    category,
			Tags:        rj.Tags,
			Salary:      rj.Salary,
			PostedAt:    postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[Remotive] Fetched %d jobs", len(jobs))
	return jobs, nil
}

// mapRemotiveCategory maps Remotive's category strings to our standard categories
func mapRemotiveCategory(cat string) string {
	catLower := strings.ToLower(cat)
	switch {
	case strings.Contains(catLower, "software") || strings.Contains(catLower, "dev"):
		return "Engineering"
	case strings.Contains(catLower, "design"):
		return "Design"
	case strings.Contains(catLower, "marketing"):
		return "Marketing"
	case strings.Contains(catLower, "data"):
		return "Data Science"
	case strings.Contains(catLower, "devops") || strings.Contains(catLower, "sysadmin"):
		return "DevOps"
	case strings.Contains(catLower, "product"):
		return "Product"
	case strings.Contains(catLower, "customer") || strings.Contains(catLower, "support"):
		return "Customer Support"
	case strings.Contains(catLower, "sales") || strings.Contains(catLower, "business"):
		return "Sales"
	case strings.Contains(catLower, "writing") || strings.Contains(catLower, "content"):
		return "Writing"
	case strings.Contains(catLower, "hr") || strings.Contains(catLower, "human"):
		return "HR"
	case strings.Contains(catLower, "finance") || strings.Contains(catLower, "legal"):
		return "Finance"
	case strings.Contains(catLower, "qa") || strings.Contains(catLower, "testing"):
		return "QA"
	default:
		return "Engineering"
	}
}
