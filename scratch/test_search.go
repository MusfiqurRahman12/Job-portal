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
	query := `site:lever.co "Golang" "remote"`
	fmt.Printf("Searching Ask.com for: %s\n", query)

	client := &http.Client{Timeout: 15 * time.Second}
	searchURL := fmt.Sprintf("https://www.ask.com/web?q=%s", url.QueryEscape(query))

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error fetching search: %v\n", err)
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

	if len(bodyStr) > 1000 {
		fmt.Println("=== HTML PREVIEW ===")
		fmt.Println(bodyStr[:1000])
		fmt.Println("====================")
	}

	re := regexp.MustCompile(`https?://[^\s"'<>%&]+(?:lever\.co|greenhouse\.io)[^\s"'<>%&]*`)
	matches := re.FindAllString(bodyStr, -1)
	fmt.Printf("Found %d raw matches\n", len(matches))

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
		fmt.Printf("Match %d: %s\n", i, decoded)
	}
}
