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

// rssJobFeed matches standard RSS 2.0 structures
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

// atomJobFeed matches Atom 1.0 structures
type atomJobFeed struct {
	XMLName xml.Name       `xml:"feed"`
	Entries []atomJobEntry `xml:"entry"`
}

type atomJobEntry struct {
	Title     string        `xml:"title"`
	Links     []atomJobLink `xml:"link"`
	Summary   string        `xml:"summary"`
	Content   string        `xml:"content"`
	Updated   string        `xml:"updated"`
	Published string        `xml:"published"`
	Category  struct {
		Term string `xml:"term,attr"`
	} `xml:"category"`
}

type atomJobLink struct {
	Href string `xml:"href,attr"`
	Rel  string `xml:"rel,attr"`
}

func sanitizeXML(data []byte) []byte {
	s := string(data)
	// Replace common HTML entities that break standard Go XML parser
	replacements := map[string]string{
		"&nbsp;":  " ",
		"&rsquo;": "'",
		"&lsquo;": "'",
		"&ldquo;": "\"",
		"&rdquo;": "\"",
		"&ndash;": "-",
		"&mdash;": "-",
		"&middot;": "*",
		"&hellip;": "...",
		"&amp;nbsp;": " ",
	}
	for k, v := range replacements {
		s = strings.ReplaceAll(s, k, v)
	}
	return []byte(s)
}

func (s *RSSJobScraper) Crawl() ([]shared.Job, error) {
	client := &http.Client{Timeout: 30 * time.Second}

	req, err := http.NewRequest("GET", s.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "FutureTalent Job Aggregator/1.0 (Mozilla/5.0)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch feed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Sanitize XML entities first
	sanitizedBody := sanitizeXML(body)

	// Try RSS first
	var rss rssJobFeed
	if err := xml.Unmarshal(sanitizedBody, &rss); err == nil && len(rss.Channel.Items) > 0 {
		return s.parseRSSJobs(rss.Channel.Items), nil
	}

	// Fallback to Atom
	var atom atomJobFeed
	if err := xml.Unmarshal(sanitizedBody, &atom); err == nil && len(atom.Entries) > 0 {
		return s.parseAtomJobs(atom.Entries), nil
	}

	return nil, fmt.Errorf("failed to parse feed as RSS or Atom")
}

func (s *RSSJobScraper) parseRSSJobs(items []rssJobItem) []shared.Job {
	var jobs []shared.Job
	for _, item := range items {
		if item.Title == "" || item.Link == "" {
			continue
		}

		title, company := splitTitleAndCompany(item.Title)
		location := "Remote Worldwide"
		remoteType := "worldwide"
		workplaceType := shared.DetectWorkplaceType(title, location, item.Description)
		category := CategorizeJob(title, nil, item.Category)
		postedAt := parseFeedDate(item.PubDate)

		desc := cleanHTMLDescription(item.Description)

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
	return jobs
}

func (s *RSSJobScraper) parseAtomJobs(entries []atomJobEntry) []shared.Job {
	var jobs []shared.Job
	for _, entry := range entries {
		if entry.Title == "" {
			continue
		}

		link := ""
		for _, l := range entry.Links {
			if l.Rel == "alternate" || l.Rel == "" {
				link = l.Href
				break
			}
		}
		if link == "" && len(entry.Links) > 0 {
			link = entry.Links[0].Href
		}
		if link == "" {
			continue
		}

		title, company := splitTitleAndCompany(entry.Title)
		location := "Remote Worldwide"
		remoteType := "worldwide"

		desc := entry.Content
		if desc == "" {
			desc = entry.Summary
		}
		desc = cleanHTMLDescription(desc)

		workplaceType := shared.DetectWorkplaceType(title, location, desc)
		category := CategorizeJob(title, nil, entry.Category.Term)

		dateStr := entry.Published
		if dateStr == "" {
			dateStr = entry.Updated
		}
		postedAt := parseFeedDate(dateStr)

		job := shared.Job{
			Title:         title,
			Company:       company,
			Location:      location,
			Description:   desc,
			Source:        s.Name(),
			URL:           link,
			RemoteType:    remoteType,
			WorkplaceType: workplaceType,
			Category:      category,
			PostedAt:      postedAt,
		}
		job.SetExpiration()
		jobs = append(jobs, job)
	}

	log.Printf("[%s Atom] Fetched %d jobs", s.name, len(jobs))
	return jobs
}

func splitTitleAndCompany(fullTitle string) (string, string) {
	title := fullTitle
	company := "Remote Company"

	if idx := strings.LastIndex(title, " at "); idx > 0 {
		company = strings.TrimSpace(title[idx+4:])
		title = strings.TrimSpace(title[:idx])
	} else if idx := strings.Index(title, ": "); idx > 0 {
		company = strings.TrimSpace(title[:idx])
		title = strings.TrimSpace(title[idx+2:])
	} else if idx := strings.Index(title, " | "); idx > 0 {
		titlePart := strings.TrimSpace(title[:idx])
		companyPart := strings.TrimSpace(title[idx+3:])
		if !strings.Contains(strings.ToLower(companyPart), "remote") && len(companyPart) < 40 {
			company = companyPart
			title = titlePart
		}
	}
	return title, company
}

func cleanHTMLDescription(desc string) string {
	desc = strings.ReplaceAll(desc, "<br>", "\n")
	desc = strings.ReplaceAll(desc, "<br/>", "\n")
	desc = strings.ReplaceAll(desc, "<br />", "\n")
	desc = strings.ReplaceAll(desc, "</p>", "\n")
	desc = strings.ReplaceAll(desc, "</li>", "\n")
	return desc
}

func parseFeedDate(dateStr string) time.Time {
	if dateStr == "" {
		return time.Now()
	}
	formats := []string{
		time.RFC3339,
		time.RFC1123Z,
		time.RFC1123,
		time.RFC822,
		time.RFC822Z,
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"Mon, 02 Jan 2006 15:04:05 MST",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
	}
	for _, f := range formats {
		if parsed, err := time.Parse(f, strings.TrimSpace(dateStr)); err == nil {
			return parsed
		}
	}
	return time.Now()
}
