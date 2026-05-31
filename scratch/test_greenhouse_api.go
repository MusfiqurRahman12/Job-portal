package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func main() {
	query := `site:greenhouse.io "Golang" "remote"`
	fmt.Printf("Searching DuckDuckGo Lite for: %s\n", query)

	client := &http.Client{Timeout: 15 * time.Second}
	searchURL := fmt.Sprintf("https://lite.duckduckgo.com/lite/?q=%s", url.QueryEscape(query))

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
	} else {
		fmt.Println(bodyStr)
	}

	// Print all lines containing greenhouse.io
	lines := strings.Split(bodyStr, "\n")
	foundAny := false
	for _, line := range lines {
		if strings.Contains(line, "greenhouse.io") {
			fmt.Printf("Line match: %s\n", strings.TrimSpace(line))
			foundAny = true
		}
	}
	if !foundAny {
		fmt.Println("No line matched greenhouse.io in raw HTML")
	}
}
