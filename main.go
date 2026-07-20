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
	engine.AddScraper(scraper.NewWWRScraper())         // We Work Remotely (RSS feed)
	engine.AddScraper(scraper.NewRemoteOKScraper())     // RemoteOK (JSON API)
	engine.AddScraper(scraper.NewRemotiveScraper())     // Remotive (JSON API)
	engine.AddScraper(scraper.NewArbeitnowScraper())    // Arbeitnow (JSON API)
	engine.AddScraper(scraper.NewJobicyScraper())       // Jobicy (JSON API)
	engine.AddScraper(scraper.NewAtsScraper(aiService)) // Direct ATS boards direct scraping
	engine.AddScraper(scraper.NewBluedoorScraper())     // Bluedoor Job Postings API
	engine.AddScraper(scraper.NewTheMuseScraper())      // TheMuse public API (no key needed, 400K+ jobs pool)

	// RSS Job Boards (Active & Verified)
	engine.AddScraper(scraper.NewRSSJobScraper("Himalayas", "https://himalayas.app/jobs/rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("Hasjob", "https://hasjob.co/feed"))
	engine.AddScraper(scraper.NewRSSJobScraper("Jobspresso", "https://jobspresso.co/feed/?post_type=job_listing"))
	engine.AddScraper(scraper.NewRSSJobScraper("PythonOrg", "https://www.python.org/jobs/feed/rss/"))
	engine.AddScraper(scraper.NewRSSJobScraper("Dribbble", "https://dribbble.com/jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("LaraJobs", "https://larajobs.com/feed"))
	engine.AddScraper(scraper.NewRSSJobScraper("GolangProjects", "https://www.golangprojects.com/rss.xml"))
	engine.AddScraper(scraper.NewRSSJobScraper("JobsCollider", "https://jobscollider.com/remote-jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("WorkAtAStartup", "https://www.workatastartup.com/jobs.rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("StartupJobs", "https://startup.jobs/rss"))
	engine.AddScraper(scraper.NewRSSJobScraper("WWR Programming", "https://weworkremotely.com/categories/remote-programming-jobs.rss"))

	// Register all news/blog RSS scrapers
	engine.AddNewsScraper(scraper.NewRSSScraper("TechCrunch", "https://techcrunch.com/feed/"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Sorry I Was On Mute", "https://sorryonmute.com/feed/"))
	engine.AddNewsScraper(scraper.NewRSSScraper("The Verge", "https://www.theverge.com/rss/index.xml")) // Now parsed as Atom
	engine.AddNewsScraper(scraper.NewRSSScraper("Wired", "https://www.wired.com/feed/rss"))
	engine.AddNewsScraper(scraper.NewRSSScraper("MIT Tech Review", "https://www.technologyreview.com/feed/"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Dev.to", "https://dev.to/feed"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Fast Company", "https://www.fastcompany.com/technology/rss"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Ars Technica", "https://feeds.arstechnica.com/arstechnica/technology-lab"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Google Blog", "https://blog.google/rss/"))
	engine.AddNewsScraper(scraper.NewRSSScraper("Meta Engineering", "https://engineering.fb.com/feed/"))

	engine.Run()
	log.Println("✅ Scrape cycle complete")

	// Run database cleanup synchronously
	db.RunCleanupSync()
}

func runAPI(db *scraper.DB) {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	api := scraper.NewAPIServer(db, port)
	api.Start() // This blocks — runs the HTTP server
}
