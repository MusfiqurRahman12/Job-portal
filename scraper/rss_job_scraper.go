package scraper

import (
	"encoding/xml"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"strings"
	"time"
)

type RSSJobScraper struct {
	name    string
	feedURL string
}

func NewRSSJobScraper(name, feedURL string) *RSSJobScraper {
	return &RSSJobScraper{
		name:    name,
		feedURL: feedURL,
	}
}

func (s *RSSJobScraper) Name() string {
	return s.name
}

type rssJobFeed struct {
	XMLName xml.Name `xml:"rss"`
	Channel struct {
		Items []rssJobItem `xml:"item"`
	} `xml:"channel"`
}

type rssJobItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	Category    string `xml:"category"`
}

func (s *RSSJobScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", s.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("RSS feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var feed rssJobFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("failed to parse RSS XML: %w", err)
	}

	var jobs []shared.Job
	for _, item := range feed.Channel.Items {
		if item.Title == "" || item.Link == "" {
			continue
		}

		// Smart title & company parser
		title := item.Title
		company := "Remote Company"

		// Format: "Job Title at Company Name"
		if idx := strings.LastIndex(title, " at "); idx > 0 {
			company = strings.TrimSpace(title[idx+4:])
			title = strings.TrimSpace(title[:idx])
		} else if idx := strings.Index(title, ": "); idx > 0 {
			// Format: "Company Name: Job Title"
			company = strings.TrimSpace(title[:idx])
			title = strings.TrimSpace(title[idx+2:])
		} else if idx := strings.Index(title, " | "); idx > 0 {
			// Format: "Job Title | Company Name"
			titlePart := strings.TrimSpace(title[:idx])
			companyPart := strings.TrimSpace(title[idx+3:])
			if !strings.Contains(strings.ToLower(companyPart), "remote") && len(companyPart) < 40 {
				company = companyPart
				title = titlePart
			}
		}

		location := "Remote Worldwide"
		remoteType := "worldwide"

		// Detect workplace type
		workplaceType := shared.DetectWorkplaceType(title, location, item.Description)

		// Categorize
		category := CategorizeJob(title, nil, item.Category)

		postedAt := time.Now()
		if item.PubDate != "" {
			formats := []string{
				time.RFC1123,
				time.RFC1123Z,
				time.RFC822,
				time.RFC822Z,
				"Mon, 02 Jan 2006 15:04:05 -0700",
				"Mon, 02 Jan 2006 15:04:05 MST",
				"2006-01-02T15:04:05Z",
			}
			for _, f := range formats {
				if parsed, err := time.Parse(f, item.PubDate); err == nil {
					postedAt = parsed
					break
				}
			}
		}

		// Clean HTML from description
		desc := item.Description
		desc = strings.ReplaceAll(desc, "<br>", "\n")
		desc = strings.ReplaceAll(desc, "<br/>", "\n")
		desc = strings.ReplaceAll(desc, "<br />", "\n")
		desc = strings.ReplaceAll(desc, "</p>", "\n")
		desc = strings.ReplaceAll(desc, "</li>", "\n")

		job := shared.Job{
			Title:         title,
			Company:       company,
			Location:      location,
			Description:   desc,
			Source:        s.Name(),
			URL:           item.Link,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			PostedAt:      postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[%s RSS] Fetched %d jobs", s.name, len(jobs))
	return jobs, nil
}
