package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type IndexRequest struct {
	URL  string `json:"url"`
	Type string `json:"type"` // "URL_UPDATED" (publish/update) or "URL_DELETED" (expired/removed)
}

// getGoogleClient checks environment variables and local JSON files for GCP OAuth2 credentials.
// It returns an authenticated http.Client if credentials are found, otherwise returns nil and logs a warning.
func getGoogleClient() (*http.Client, error) {
	ctx := context.Background()
	scope := "https://www.googleapis.com/auth/indexing"

	// 1. Check for raw JSON string in environment variable (useful for CI/CD and production environments)
	if envCreds := os.Getenv("GOOGLE_INDEXING_CREDENTIALS"); envCreds != "" {
		creds, err := google.CredentialsFromJSON(ctx, []byte(envCreds), scope)
		if err != nil {
			return nil, fmt.Errorf("failed to parse GOOGLE_INDEXING_CREDENTIALS env variable: %w", err)
		}
		return oauth2.NewClient(ctx, creds.TokenSource), nil
	}

	// 2. Check for local google-credentials.json file
	credentialsPaths := []string{
		"google-credentials.json",
		"scraper/google-credentials.json",
	}

	for _, path := range credentialsPaths {
		if _, err := os.Stat(path); err == nil {
			data, err := os.ReadFile(path)
			if err != nil {
				return nil, fmt.Errorf("failed to read credentials file at %s: %w", path, err)
			}
			creds, err := google.CredentialsFromJSON(ctx, data, scope)
			if err != nil {
				return nil, fmt.Errorf("failed to parse credentials file at %s: %w", path, err)
			}
			return oauth2.NewClient(ctx, creds.TokenSource), nil
		}
	}

	// 3. Fallback to standard Google Application Default Credentials
	creds, err := google.FindDefaultCredentials(ctx, scope)
	if err == nil {
		return oauth2.NewClient(ctx, creds.TokenSource), nil
	}

	// If no credentials found, return nil without failing to keep the scraper running gracefully
	return nil, nil
}

// NotifyGoogleIndexing sends a publish/delete notification to Google Indexing API for the given job URL.
func NotifyGoogleIndexing(jobURL string, actionType string) error {
	client, err := getGoogleClient()
	if err != nil {
		return fmt.Errorf("auth error: %w", err)
	}

	if client == nil {
		log.Printf("[Indexing] ⚠️ No Google Indexing API credentials configured. Skipping notification for URL: %s", jobURL)
		return nil
	}

	reqBody, err := json.Marshal(IndexRequest{
		URL:  jobURL,
		Type: actionType,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", "https://indexing.googleapis.com/v3/urlNotifications:publish", strings.NewReader(string(reqBody)))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API returned non-200 code (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("[Indexing] 🚀 Successfully sent URL notification (%s) for: %s", actionType, jobURL)
	return nil
}

var nonAlphanumericRegexp = regexp.MustCompile(`[^\w\s\-]`)
var whitespaceRegexp = regexp.MustCompile(`[\s_]+`)
var multipleDashesRegexp = regexp.MustCompile(`\-+`)

// Slugify formats a text into a clean, URL-friendly slug.
func Slugify(text string) string {
	text = strings.ToLower(text)
	text = strings.ReplaceAll(text, "&", "and")
	text = nonAlphanumericRegexp.ReplaceAllString(text, "")
	text = whitespaceRegexp.ReplaceAllString(text, "-")
	text = multipleDashesRegexp.ReplaceAllString(text, "-")
	return strings.Trim(text, "-")
}
