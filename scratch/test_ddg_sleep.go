package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

func main() {
	// First let's sleep for 20 seconds to clear any temp rate limit
	fmt.Println("Sleeping for 20 seconds to clear rate limit...")
	time.Sleep(20 * time.Second)

	query := `site:greenhouse.io "Golang" "remote"`
	fmt.Printf("Searching DuckDuckGo Lite for: %s\n", query)

	client := &http.Client{Timeout: 15 * time.Second}
	searchURL := fmt.Sprintf("https://lite.duckduckgo.com/lite/?q=%s", url.QueryEscape(query))

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading body: %v\n", err)
		return
	}

	bodyStr := string(body)
	fmt.Printf("Read %d bytes\n", len(bodyStr))

	if strings.Contains(bodyStr, "anomaly.js") || strings.Contains(bodyStr, "challenge-form") {
		fmt.Println("⚠️ STILL BLOCKED by bot challenge!")
		return
	}

	re := regexp.MustCompile(`https?://[^\s"'<>%&]+(?:greenhouse\.io)[^\s"'<>%&]*`)
	matches := re.FindAllString(bodyStr, -1)
	fmt.Printf("Found %d matches\n", len(matches))

	seen := make(map[string]bool)
	for i, m := range matches {
		decoded, err := url.QueryUnescape(m)
		if err != nil {
			decoded = m
		}
		if idx := strings.Index(decoded, "?"); idx > 0 {
			decoded = decoded[:idx]
		}
		if idx := strings.Index(decoded, "&"); idx > 0 {
			decoded = decoded[:idx]
		}
		if idx := strings.Index(decoded, "\""); idx > 0 {
			decoded = decoded[:idx]
		}
		if seen[decoded] {
			continue
		}
		seen[decoded] = true
		fmt.Printf("Greenhouse URL %d: %s\n", i, decoded)
	}
}
