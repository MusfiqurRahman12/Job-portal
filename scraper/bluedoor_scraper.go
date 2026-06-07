package scraper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"strings"
	"time"
)

type BluedoorScraper struct {
	searchURL      string
	batchLookupURL string
}

func NewBluedoorScraper() *BluedoorScraper {
	return &BluedoorScraper{
		searchURL:      "https://api.bluedoor.sh/job-postings/v1/jobs/search",
		batchLookupURL: "https://api.bluedoor.sh/job-postings/v1/orgs/batch_lookup",
	}
}

func (b *BluedoorScraper) Name() string {
	return "Bluedoor"
}

type bluedoorJob struct {
	JobID           string `json:"job_id"`
	OrgID           string `json:"org_id"`
	Title           string `json:"title"`
	LocationText    string `json:"location_text"`
	Country         string `json:"country"`
	EmploymentType  string `json:"employment_type"`
	WorkplaceType   string `json:"workplace_type"` // on_site, remote, hybrid
	SalaryRaw       string `json:"salary_raw"`
	SourceURL       string `json:"source_url"`
	ApplyURL        string `json:"apply_url"`
	DescriptionText string `json:"description_text"`
}

type bluedoorSearchResponse struct {
	Data []bluedoorJob `json:"data"`
}

type bluedoorBatchRequest struct {
	OrgIDs []string `json:"org_ids"`
}

type bluedoorOrg struct {
	OrgID       string `json:"org_id"`
	DisplayName string `json:"display_name"`
}

type bluedoorBatchResponse struct {
	Data []struct {
		Data bluedoorOrg `json:"data"`
	} `json:"data"`
}

func (b *BluedoorScraper) lookupOrgs(orgIDs []string) (map[string]string, error) {
	if len(orgIDs) == 0 {
		return map[string]string{}, nil
	}

	reqBody, err := json.Marshal(bluedoorBatchRequest{OrgIDs: orgIDs})
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("POST", b.batchLookupURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("batch lookup returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var batchResp bluedoorBatchResponse
	if err := json.Unmarshal(body, &batchResp); err != nil {
		return nil, err
	}

	orgMap := make(map[string]string)
	for _, item := range batchResp.Data {
		if item.Data.OrgID != "" && item.Data.DisplayName != "" {
			orgMap[item.Data.OrgID] = item.Data.DisplayName
		}
	}

	return orgMap, nil
}

func (b *BluedoorScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	url := fmt.Sprintf("%s?limit=25&include=description", b.searchURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("jobs search API returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var searchResp bluedoorSearchResponse
	if err := json.Unmarshal(body, &searchResp); err != nil {
		return nil, err
	}

	var orgIDs []string
	orgIDSet := make(map[string]bool)
	for _, j := range searchResp.Data {
		if j.OrgID != "" && !orgIDSet[j.OrgID] {
			orgIDSet[j.OrgID] = true
			orgIDs = append(orgIDs, j.OrgID)
		}
	}

	orgNames, err := b.lookupOrgs(orgIDs)
	if err != nil {
		log.Printf("[Bluedoor] Warning: failed to batch lookup org names: %v", err)
		orgNames = make(map[string]string)
	}

	var jobs []shared.Job
	for _, bj := range searchResp.Data {
		if bj.Title == "" {
			continue
		}

		company := orgNames[bj.OrgID]
		if company == "" {
			company = "Bluedoor Employer"
		}

		workplaceType := "remote"
		if bj.WorkplaceType != "" {
			switch strings.ToLower(bj.WorkplaceType) {
			case "remote":
				workplaceType = "remote"
			case "hybrid":
				workplaceType = "hybrid"
			case "on_site", "onsite":
				workplaceType = "onsite"
			default:
				workplaceType = shared.DetectWorkplaceType(bj.Title, bj.LocationText, bj.DescriptionText)
			}
		} else {
			workplaceType = shared.DetectWorkplaceType(bj.Title, bj.LocationText, bj.DescriptionText)
		}

		remoteType := "worldwide"
		if workplaceType == "onsite" {
			remoteType = "country"
		} else {
			locLower := strings.ToLower(bj.LocationText)
			if strings.Contains(locLower, "usa") || strings.Contains(locLower, "united states") ||
				strings.Contains(locLower, "germany") || strings.Contains(locLower, "uk") ||
				strings.Contains(locLower, "united kingdom") {
				remoteType = "country"
			}
		}

		category := CategorizeJob(bj.Title, nil, bj.EmploymentType)

		urlLink := bj.ApplyURL
		if urlLink == "" {
			urlLink = bj.SourceURL
		}
		if urlLink == "" {
			continue
		}

		job := shared.Job{
			Title:         bj.Title,
			Company:       company,
			Location:      bj.LocationText,
			Description:   bj.DescriptionText,
			Source:        b.Name(),
			URL:           urlLink,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			PostedAt:      time.Now(),
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[Bluedoor] Fetched %d jobs successfully", len(jobs))
	return jobs, nil
}
