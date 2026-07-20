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

// NewsScraper defines the interface for news and blog syndicators
type NewsScraper interface {
	Name() string
	CrawlNews() ([]shared.News, error)
}

// RSSScraper scrapes articles from standard RSS 2.0 and Atom feeds
type RSSScraper struct {
	name    string
	feedURL string
}

func NewRSSScraper(name, feedURL string) *RSSScraper {
	return &RSSScraper{
		name:    name,
		feedURL: feedURL,
	}
}

func (r *RSSScraper) Name() string {
	return r.name
}

// rssXML matches standard RSS 2.0 XML structures
type rssXML struct {
	XMLName xml.Name   `xml:"rss"`
	Channel channelXML `xml:"channel"`
}

type channelXML struct {
	Items []itemXML `xml:"item"`
}

type itemXML struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
	Content     string `xml:"encoded"` // Maps to <content:encoded>
}

// atomFeed matches Atom 1.0 XML structures (used by The Verge, Hasjob, etc.)
type atomFeed struct {
	XMLName xml.Name    `xml:"feed"`
	Entries []atomEntry `xml:"entry"`
}

type atomEntry struct {
	Title     string      `xml:"title"`
	Links     []atomLink  `xml:"link"`
	Summary   string      `xml:"summary"`
	Content   atomContent `xml:"content"`
	Updated   string      `xml:"updated"`
	Published string      `xml:"published"`
}

type atomLink struct {
	Href string `xml:"href,attr"`
	Rel  string `xml:"rel,attr"`
	Type string `xml:"type,attr"`
}

type atomContent struct {
	Body string `xml:",chardata"`
	Type string `xml:"type,attr"`
}

// CrawlNews fetches and decodes RSS or Atom feed articles
func (r *RSSScraper) CrawlNews() ([]shared.News, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", r.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("User-Agent", "FutureTalent News Aggregator/1.0 (Mozilla/5.0)")

	var resp *http.Response
	var doErr error
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		resp, doErr = client.Do(req)
		if doErr == nil && resp.StatusCode == 200 {
			break
		}

		if resp != nil && resp.StatusCode != 200 {
			resp.Body.Close()
		}

		if i < maxRetries-1 {
			backoff := time.Duration(1<<i) * time.Second
			log.Printf("[%s] Feed request failed (err: %v), retrying in %v...", r.Name(), doErr, backoff)
			time.Sleep(backoff)
		}
	}

	if doErr != nil {
		return nil, fmt.Errorf("failed to execute GET request after %d retries: %w", maxRetries, doErr)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("feed server returned code %d after %d retries", resp.StatusCode, maxRetries)
	}

	xmlData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response payload: %w", err)
	}

	// Try RSS first
	var rss rssXML
	if err := xml.Unmarshal(xmlData, &rss); err == nil && len(rss.Channel.Items) > 0 {
		return r.parseRSSItems(rss.Channel.Items), nil
	}

	// Fallback to Atom
	var atom atomFeed
	if err := xml.Unmarshal(xmlData, &atom); err == nil && len(atom.Entries) > 0 {
		return r.parseAtomEntries(atom.Entries), nil
	}

	return nil, fmt.Errorf("failed to parse feed as RSS or Atom")
}

func (r *RSSScraper) parseRSSItems(items []itemXML) []shared.News {
	var articles []shared.News
	for _, item := range items {
		if item.Title == "" || item.Link == "" {
			continue
		}

		rawContent := item.Content
		if rawContent == "" {
			rawContent = item.Description
		}

		article := shared.News{
			Title:       item.Title,
			Content:     rawContent,
			URL:         item.Link,
			Author:      r.Name(),
			PublishedAt: parseDate(item.PubDate),
		}
		articles = append(articles, article)
	}

	log.Printf("[%s] Crawled %d articles from RSS feed", r.Name(), len(articles))
	return articles
}

func (r *RSSScraper) parseAtomEntries(entries []atomEntry) []shared.News {
	var articles []shared.News
	for _, entry := range entries {
		if entry.Title == "" {
			continue
		}

		// Get best link (prefer "alternate" rel, fallback to first href)
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

		rawContent := entry.Content.Body
		if rawContent == "" {
			rawContent = entry.Summary
		}

		dateStr := entry.Published
		if dateStr == "" {
			dateStr = entry.Updated
		}

		article := shared.News{
			Title:       entry.Title,
			Content:     rawContent,
			URL:         link,
			Author:      r.Name(),
			PublishedAt: parseDate(dateStr),
		}
		articles = append(articles, article)
	}

	log.Printf("[%s] Crawled %d articles from Atom feed", r.Name(), len(articles))
	return articles
}

// parseDate tries multiple date formats commonly found in RSS/Atom feeds
func parseDate(dateStr string) time.Time {
	if dateStr == "" {
		return time.Now()
	}
	formats := []string{
		time.RFC3339,
		time.RFC1123Z,
		time.RFC1123,
		"Mon, 02 Jan 2006 15:04:05 -0700",
		"Mon, 02 Jan 2006 15:04:05 MST",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05-07:00",
		"2006-01-02 15:04:05",
	}
	for _, layout := range formats {
		if parsed, err := time.Parse(layout, strings.TrimSpace(dateStr)); err == nil {
			return parsed
		}
	}
	return time.Now()
}
