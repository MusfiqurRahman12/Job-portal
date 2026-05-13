package scraper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"job-portal-crawler/shared"
	"log"
	"net/http"
	"strings"
	"time"
)

type AIService struct {
	apiKey string
}

func NewAIService(apiKey string) *AIService {
	return &AIService{apiKey: apiKey}
}

// OptimizeJob content for SEO using AI
func (ai *AIService) OptimizeJob(job *shared.Job) error {
	if ai.apiKey == "" {
		return nil // Skip if no API key
	}

	log.Printf("[AI] Optimizing description for: %s", job.Title)

	prompt := fmt.Sprintf(`You are an expert SEO copywriter for a premium remote job portal.
Your task is to rewrite the following job description to be highly engaging, professional, and SEO-optimized for Google AdSense compliance.
Ensure the content is unique and reads smoothly. Do NOT alter the core requirements, salary, or technical facts.
Format the output with clean markdown (use headings, bullet points, and bold text appropriately).

Original Description:
%s`, job.Description)

	reqBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.7,
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to encode gemini request: %w", err)
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", ai.apiKey)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("failed to create gemini request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call gemini api: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("gemini API error: %d - %s", resp.StatusCode, string(body))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		newDesc := geminiResp.Candidates[0].Content.Parts[0].Text
		newDesc = strings.TrimSpace(newDesc)
		newDesc = strings.TrimPrefix(newDesc, "```markdown")
		newDesc = strings.TrimPrefix(newDesc, "```")
		newDesc = strings.TrimSuffix(newDesc, "```")
		job.Description = strings.TrimSpace(newDesc)
		log.Printf("[AI] Successfully optimized: %s", job.Title)
	}

	return nil
}
