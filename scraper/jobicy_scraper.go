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

type JobicyScraper struct {
	apiURL string
}

func NewJobicyScraper() *JobicyScraper {
	return &JobicyScraper{
		apiURL: "https://jobicy.com/api/v2/remote-jobs",
	}
}

func (j *JobicyScraper) Name() string {
	return "Jobicy"
}

type jobicyJob struct {
	ID             interface{} `json:"id"`
	URL            string      `json:"url"`
	JobTitle       string      `json:"jobTitle"`
	CompanyName    string      `json:"companyName"`
	CompanyLogo    string      `json:"companyLogo"`
	JobIndustry    []string    `json:"jobIndustry"`
	JobType        []string    `json:"jobType"`
	JobGeo         string      `json:"jobGeo"`
	JobLevel       string      `json:"jobLevel"`
	JobExcerpt     string      `json:"jobExcerpt"`
	JobDescription string      `json:"jobDescription"`
	PubDate        string      `json:"pubDate"`
	SalaryMin      interface{} `json:"salaryMin"`
	SalaryMax      interface{} `json:"salaryMax"`
	SalaryCurrency string      `json:"salaryCurrency"`
}

type jobicyResponse struct {
	JobCount int         `json:"jobCount"`
	Jobs     []jobicyJob `json:"jobs"`
}

func (j *JobicyScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", j.apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Jobicy API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("jobicy API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var apiResp jobicyResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	var jobs []shared.Job
	for _, jj := range apiResp.Jobs {
		if jj.JobTitle == "" || jj.URL == "" {
			continue
		}

		location := jj.JobGeo
		if location == "" {
			location = "Remote Worldwide"
		}

		remoteType := "worldwide"
		locLower := strings.ToLower(location)
		if locLower != "anywhere" && locLower != "worldwide" {
			remoteType = "country"
		}

		industry := ""
		if len(jj.JobIndustry) > 0 {
			industry = jj.JobIndustry[0]
		}
		category := CategorizeJob(jj.JobTitle, nil, industry)

		// Detect workplace type from title/location/description
		workplaceType := shared.DetectWorkplaceType(jj.JobTitle, location, jj.JobDescription)

		postedAt := time.Now()
		if jj.PubDate != "" {
			// Jobicy uses "YYYY-MM-DD HH:MM:SS" or ISO formats
			formats := []string{
				"2006-01-02 15:04:05",
				time.RFC3339,
				"2006-01-02T15:04:05Z",
			}
			for _, f := range formats {
				if parsed, err := time.Parse(f, jj.PubDate); err == nil {
					postedAt = parsed
					break
				}
			}
		}

		// Parse Salary
		salary := ""
		var sMin, sMax string
		if jj.SalaryMin != nil {
			sMin = strings.TrimSpace(fmt.Sprintf("%v", jj.SalaryMin))
		}
		if jj.SalaryMax != nil {
			sMax = strings.TrimSpace(fmt.Sprintf("%v", jj.SalaryMax))
		}
		if sMin != "" && sMin != "<nil>" && sMin != "0" && sMax != "" && sMax != "<nil>" && sMax != "0" {
			currency := jj.SalaryCurrency
			if currency == "" {
				currency = "USD"
			}
			salary = fmt.Sprintf("%s %s - %s", currency, sMin, sMax)
		}

		// Clean HTML from description
		desc := jj.JobDescription
		if desc == "" {
			desc = jj.JobExcerpt
		}
		desc = strings.ReplaceAll(desc, "<br>", "\n")
		desc = strings.ReplaceAll(desc, "<br/>", "\n")
		desc = strings.ReplaceAll(desc, "<br />", "\n")
		desc = strings.ReplaceAll(desc, "</p>", "\n")
		desc = strings.ReplaceAll(desc, "</li>", "\n")

		job := shared.Job{
			Title:         jj.JobTitle,
			Company:       jj.CompanyName,
			CompanyLogo:   jj.CompanyLogo,
			Location:      location,
			Description:   desc,
			Source:        j.Name(),
			URL:           jj.URL,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			Salary:        salary,
			PostedAt:      postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[Jobicy] Fetched %d jobs", len(jobs))
	return jobs, nil
}
