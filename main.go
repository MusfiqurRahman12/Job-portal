package main

import (
	"job-portal-crawler/scraper"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	log.Println("🚀 Starting Job Portal Crawler Engine...")

	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	// Initialize Database
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := scraper.NewDB(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Automatically run database migrations/schema updates
	err = db.InitSchema()
	if err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Start background cleanup scheduler (deactivates expired jobs every hour)
	stopCleanup := make(chan struct{})
	db.StartCleanupScheduler(stopCleanup)
	defer close(stopCleanup)

	// Initialize AI Service
	aiKey := os.Getenv("GEMINI_API_KEY")
	aiService := scraper.NewAIService(aiKey)

	// Determine run mode from args
	mode := "all"
	if len(os.Args) > 1 {
		mode = os.Args[1]
	}

	switch mode {
	case "scrape":
		// Only run scrapers
		runScrapers(db, aiService)
	case "serve":
		// Only start the API server
		runAPI(db)
	case "all":
		// Run scrapers first, then start API server
		runScrapers(db, aiService)
		runAPI(db)
	default:
		log.Fatalf("Unknown mode: %s. Use 'scrape', 'serve', or 'all'", mode)
	}
}

func runScrapers(db *scraper.DB, aiService *scraper.AIService) {
	engine := scraper.NewEngine(db, aiService)

	// Register all job scrapers — each runs concurrently via goroutines
	engine.AddScraper(scraper.NewWWRScraper())       // We Work Remotely (RSS feed)
	engine.AddScraper(scraper.NewRemoteOKScraper())   // RemoteOK (JSON API)
	engine.AddScraper(scraper.NewRemotiveScraper())   // Remotive (JSON API)
	engine.AddScraper(scraper.NewArbeitnowScraper())  // Arbeitnow (JSON API)

	// Register all news/blog RSS scrapers
	engine.AddNewsScraper(scraper.NewRSSScraper("Sorry I Was On Mute", "https://sorryonmute.com/feed/"))
	engine.AddNewsScraper(scraper.NewRSSScraper("TechCrunch", "https://techcrunch.com/feed/"))

	engine.Run()
	log.Println("✅ Scrape cycle complete")
}

func runAPI(db *scraper.DB) {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	api := scraper.NewAPIServer(db, port)
	api.Start() // This blocks — runs the HTTP server
}
