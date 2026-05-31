package main

import (
	"job-portal-crawler/scraper"
	"log"
	"os"
	"strings"

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
	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
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
	aiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
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
	engine.AddScraper(scraper.NewArbeitnowScraper())  // Arbeitnow (JSON API — remote + hybrid + onsite)
	engine.AddScraper(scraper.NewFindWorkScraper())   // FindWork.dev (JSON API — remote + hybrid + onsite)
	engine.AddScraper(scraper.NewJobicyScraper())     // Jobicy (JSON API — remote)
	engine.AddScraper(scraper.NewAtsScraper(aiService)) // New Search-based direct company website scraper

	
	// New standard RSS Job boards
	engine.AddScraper(scraper.NewRSSJobScraper("Himalayas", "https://himalayas.app/jobs/rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("Jobspresso", "https://jobspresso.co/feed/?post_type=job_listing"))
	engine.AddScraper(scraper.NewRSSJobScraper("CryptoJobsList", "https://cryptojobslist.com/jobs.rss"))
	
	// Expanded RSS sources
	engine.AddScraper(scraper.NewRSSJobScraper("DailyRemote", "https://dailyremote.com/remote-jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("NoDesk", "https://nodesk.co/remote-jobs/index.xml"))
	engine.AddScraper(scraper.NewRSSJobScraper("WorkingNomads", "https://www.workingnomads.co/jobsfeed"))
	engine.AddScraper(scraper.NewRSSJobScraper("JustRemote", "https://justremote.co/remote-jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("PythonOrg", "https://www.python.org/jobs/feed/rss/"))
	engine.AddScraper(scraper.NewRSSJobScraper("Dribbble", "https://dribbble.com/jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("WorkAnywhere", "https://workanywhere.pro/rss.xml"))
	engine.AddScraper(scraper.NewRSSJobScraper("RealWorkFromAnywhere", "https://www.realworkfromanywhere.com/rss.xml"))
	engine.AddScraper(scraper.NewRSSJobScraper("LaraJobs", "https://larajobs.com/feed"))
	engine.AddScraper(scraper.NewRSSJobScraper("GolangProjects", "https://www.golangprojects.com/rss.xml"))
	engine.AddScraper(scraper.NewRSSJobScraper("JobsCollider", "https://jobscollider.com/remote-jobs.rss"))

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
