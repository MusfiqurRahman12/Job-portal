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

type WWRScraper struct {
	feedURL string
}

func NewWWRScraper() *WWRScraper {
	return &WWRScraper{
		feedURL: "https://weworkremotely.com/remote-jobs.rss",
	}
}

func (w *WWRScraper) Name() string {
	return "We Work Remotely"
}

// wwrRSSFeed represents the RSS XML structure from We Work Remotely
type wwrRSSFeed struct {
	XMLName xml.Name `xml:"rss"`
	Channel struct {
		Items []wwrRSSItem `xml:"item"`
	} `xml:"channel"`
}

type wwrRSSItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	Region      string `xml:"region"`
	Type        string `xml:"type"`
	Category    string `xml:"category"`
	Company     string `xml:"company"`
}

func (w *WWRScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", w.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch WWR RSS feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("WWR RSS returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read RSS response: %w", err)
	}

	var feed wwrRSSFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("failed to parse RSS XML: %w", err)
	}

	var jobs []shared.Job
	for _, item := range feed.Channel.Items {
		if item.Title == "" || item.Link == "" {
			continue
		}

		// Parse company name from title if not in the XML
		// WWR titles are often formatted as "Company: Job Title"
		title := item.Title
		company := item.Company
		if company == "" {
			// Try to extract company from title pattern "Company: Title"
			if idx := strings.Index(title, ": "); idx > 0 {
				company = title[:idx]
				title = title[idx+2:]
			}
		}

		location := item.Region
		if location == "" {
			location = "Remote Worldwide"
		}

		remoteType := "worldwide"
		locLower := strings.ToLower(location)
		if strings.Contains(locLower, "usa") || strings.Contains(locLower, "europe") ||
			strings.Contains(locLower, "uk") || strings.Contains(locLower, "us only") {
			remoteType = "country"
		}

		// Map WWR category to our standard categories
		category := CategorizeJob(title, nil, item.Category)

		postedAt := time.Now()
		if item.PubDate != "" {
			// RSS feeds typically use RFC1123 or RFC2822 date format
			formats := []string{
				time.RFC1123,
				time.RFC1123Z,
				"Mon, 02 Jan 2006 15:04:05 -0700",
				"Mon, 02 Jan 2006 15:04:05 MST",
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
		desc = strings.ReplaceAll(desc, "</p>", "\n")
		desc = strings.ReplaceAll(desc, "</li>", "\n")

		job := shared.Job{
			Title:       title,
			Company:     company,
			Location:    location,
			Description: desc,
			Source:      w.Name(),
			URL:         item.Link,
			RemoteType:  remoteType,
			Category:    category,
			PostedAt:    postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[WWR RSS] Fetched %d jobs", len(jobs))
	return jobs, nil
}

