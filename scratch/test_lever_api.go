package main

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	apiURL := "https://api.lever.co/v0/postings/bluelightconsulting"
	fmt.Printf("Fetching Lever postings list from: %s\n", apiURL)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(apiURL)
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

	fmt.Printf("Response Status: %d\n", resp.StatusCode)
	bodyStr := string(body)
	if len(bodyStr) > 2000 {
		fmt.Println("=== JSON PREVIEW ===")
		fmt.Println(bodyStr[:2000])
		fmt.Println("====================")
	} else {
		fmt.Println(bodyStr)
	}
}
