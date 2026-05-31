package main

import (
	"encoding/json"
	"fmt"
	"job-portal-crawler/scraper"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type outreachResponse struct {
	Domain         string `json:"domain"`
	SuggestedEmail string `json:"suggested_email"`
	EmailSubject   string `json:"email_subject"`
	EmailBody      string `json:"email_body"`
}

func main() {
	log.Println("📬 Starting AI Outreach Generator...")

	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := scraper.NewDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Ensure outreach_queue table is created
	err = db.InitSchema()
	if err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	aiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if aiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required")
	}
	aiService := scraper.NewAIService(aiKey)

	// Fetch up to 15 jobs lacking drafts to avoid quota exhaustion on a single run
	jobs, err := db.GetJobsLackingOutreach()
	if err != nil {
		log.Fatalf("Failed to query jobs: %v", err)
	}

	log.Printf("Found %d jobs lacking outreach drafts.", len(jobs))
	
	limit := 10
	if len(jobs) < limit {
		limit = len(jobs)
	}

	for i := 0; i < limit; i++ {
		job := jobs[i]
		log.Printf("[%d/%d] Generating outreach for: %s at %s...", i+1, limit, job.Title, job.Company)

		// Call Gemini to guess email and draft the message
		prompt := fmt.Sprintf(`You are a professional hiring partnership specialist at FutureTalent (https://www.futuretalent.online).
Analyze the following job details:
- Job Title: %s
- Company: %s
- Description snippet: %s

Based on this, perform the following tasks:
1. Estimate or identify the company's website domain (e.g. "aviatrix.com" for Aviatrix, "deel.com" for Deel).
2. Propose a highly plausible contact email address (e.g., careers@domain, recruiting@domain, or hr@domain).
3. Write a warm, professional, and personalized email pitch to that company's hiring or recruitment team.
   - Explain that we have featured their job listing "%s" on our premium remote job board, FutureTalent (https://www.futuretalent.online).
   - State that we are driving highly qualified remote candidates directly to their application page.
   - Politely ask if they would be open to adding a reciprocal backlink to our portal (or listing us as a hiring partner) on their site or careers page.
   - Keep the tone friendly, helpful, and professional.

Return ONLY a JSON object matching this exact schema:
{
  "domain": "estimated domain name",
  "suggested_email": "careers@domain.com",
  "email_subject": "Outreach Subject Line",
  "email_body": "Full body of the email in plain text"
}
Do NOT wrap the output in markdown backticks. Return ONLY the raw JSON.`, job.Title, job.Company, truncateText(job.Description, 800), job.Title)

		genConfig := map[string]interface{}{
			"temperature":      0.7,
			"responseMimeType": "application/json",
		}

		respBytes, err := aiService.CallGemini(prompt, genConfig)
		if err != nil {
			log.Printf("❌ Failed to call Gemini for %s: %v", job.Company, err)
			continue
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

		if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
			log.Printf("❌ Failed to unmarshal Gemini wrapper response: %v", err)
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			log.Printf("❌ Gemini returned empty content parts for %s", job.Company)
			continue
		}

		rawJSON := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
		var outreach outreachResponse
		if err := json.Unmarshal([]byte(rawJSON), &outreach); err != nil {
			log.Printf("❌ Failed to parse structured AI output: %v. Raw: %s", err, rawJSON)
			continue
		}

		// Save draft in the database queue
		jobIDInt, _ := strconv.ParseInt(job.ID, 10, 64)
		draft := scraper.OutreachDraft{
			JobID:        jobIDInt,
			Company:      job.Company,
			ContactEmail: outreach.SuggestedEmail,
			EmailSubject: outreach.EmailSubject,
			EmailBody:    outreach.EmailBody,
			Status:       "pending_approval",
		}

		err = db.SaveOutreachDraft(draft)
		if err != nil {
			log.Printf("❌ Failed to save draft for %s: %v", job.Company, err)
		} else {
			log.Printf("✅ Successfully queued outreach draft for %s (%s)", job.Company, outreach.SuggestedEmail)
		}
	}

	log.Println("✨ AI Outreach generation run complete!")
}

func truncateText(text string, max int) string {
	if len(text) <= max {
		return text
	}
	return text[:max] + "..."
}
