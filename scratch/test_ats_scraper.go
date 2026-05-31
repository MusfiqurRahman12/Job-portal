package main

import (
	"fmt"
	"job-portal-crawler/scraper"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("🧪 Testing AtsScraper...")

	// Load env
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, trying system environment variables")
	}

	aiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if aiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable is required for this test")
	}

	aiService := scraper.NewAIService(aiKey)
	atsScraper := scraper.NewAtsScraper(aiService)

	log.Printf("Starting crawl for %s...", atsScraper.Name())
	jobs, err := atsScraper.Crawl()
	if err != nil {
		log.Fatalf("❌ Crawl failed: %v", err)
	}

	log.Printf("✅ Crawl completed! Found %d jobs.", len(jobs))
	for i, j := range jobs {
		fmt.Printf("[%d] %s at %s (%s)\n", i+1, j.Title, j.Company, j.Source)
		fmt.Printf("    Location: %s | Workplace: %s | Remote: %s\n", j.Location, j.WorkplaceType, j.RemoteType)
		fmt.Printf("    Category: %s\n", j.Category)
		fmt.Printf("    URL: %s\n", j.URL)
		fmt.Println("--------------------------------------------------")
	}
}
