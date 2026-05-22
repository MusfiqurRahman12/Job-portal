package scraper

import (
	"encoding/xml"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"time"
)

// NewsScraper defines the interface for news and blog syndicators
type NewsScraper interface {
	Name() string
	CrawlNews() ([]shared.News, error)
}

// RSSScraper scrapes articles from standard RSS 2.0 feeds
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

// CrawlNews fetches and decodes RSS feed articles
func (r *RSSScraper) CrawlNews() ([]shared.News, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest("GET", r.feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set header to avoid scraping blocks
	req.Header.Set("User-Agent", "RemoteHub News Aggregator/1.0 (Mozilla/5.0; Contact: admin@remotehub.io)")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute GET request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("feed server returned code %d: %s", resp.StatusCode, string(body))
	}

	xmlData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response payload: %w", err)
	}

	var rss rssXML
	if err := xml.Unmarshal(xmlData, &rss); err != nil {
		return nil, fmt.Errorf("failed to parse RSS XML structure: %w", err)
	}

	var articles []shared.News
	for _, item := range rss.Channel.Items {
		if item.Title == "" || item.Link == "" {
			continue
		}

		// Prioritize full encoded body; fallback to summary description
		rawContent := item.Content
		if rawContent == "" {
			rawContent = item.Description
		}

		// Parse published date with standard RSS schemas
		publishedAt := time.Now()
		if item.PubDate != "" {
			formats := []string{
				time.RFC1123Z,
				time.RFC1123,
				"Mon, 02 Jan 2006 15:04:05 -0700",
				"Mon, 02 Jan 2006 15:04:05 MST",
				"2006-01-02T15:04:05Z",
				"2006-01-02 15:04:05",
			}
			for _, layout := range formats {
				if parsed, err := time.Parse(layout, item.PubDate); err == nil {
					publishedAt = parsed
					break
				}
			}
		}

		article := shared.News{
			Title:       item.Title,
			Content:     rawContent,
			URL:         item.Link,
			Author:      r.Name(),
			PublishedAt: publishedAt,
		}
		articles = append(articles, article)
	}

	log.Printf("[%s] Crawled %d articles from RSS feed", r.Name(), len(articles))
	return articles, nil
}
