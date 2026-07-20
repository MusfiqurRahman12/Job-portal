package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	var dbURL string
	if len(os.Args) > 1 {
		dbURL = strings.TrimSpace(os.Args[1])
	}

	if dbURL == "" {
		dbURL = strings.TrimSpace(os.Getenv("DATABASE_URL"))
	}

	if dbURL == "" || strings.Contains(dbURL, "localhost") {
		fmt.Println("⚠️  No production DATABASE_URL provided or DATABASE_URL points to localhost.")
		fmt.Println("Please run the script by passing your production Supabase database URL as an argument:")
		fmt.Println("  go run scratch/cleanup_production.go \"postgres://postgres:password@your-supabase-db:5432/postgres\"")
		os.Exit(1)
	}

	fmt.Println("⏳ Connecting to production database...")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("❌ Failed to open database: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	fmt.Println("✅ Connected successfully!")

	// 1. Clean Jobs
	fmt.Println("\n🧹 Cleaning up jobs...")
	res, err := db.Exec(`
		DELETE FROM jobs 
		WHERE is_active = FALSE AND expires_at < NOW() - INTERVAL '8 days'
	`)
	if err != nil {
		log.Printf("❌ Failed to delete inactive/expired jobs: %v", err)
	} else {
		rows, _ := res.RowsAffected()
		fmt.Printf("   Removed %d inactive or expired jobs (older than 8 days).\n", rows)
	}

	// 2. Clean Outreach Queue
	fmt.Println("\n🧹 Cleaning up orphaned outreach drafts...")
	res, err = db.Exec(`
		DELETE FROM outreach_queue 
		WHERE job_id IS NULL
	`)
	if err != nil {
		log.Printf("❌ Failed to clean outreach queue: %v", err)
	} else {
		rows, _ := res.RowsAffected()
		fmt.Printf("   Removed %d orphaned outreach drafts.\n", rows)
	}

	// 3. Clean News Articles (Keep only top 150)
	fmt.Println("\n🧹 Cleaning up news articles (keeping latest 150)...")
	res, err = db.Exec(`
		DELETE FROM news 
		WHERE id NOT IN (
			SELECT id FROM news 
			ORDER BY published_at DESC 
			LIMIT 150
		)
	`)
	if err != nil {
		log.Printf("❌ Failed to delete old news articles: %v", err)
	} else {
		rows, _ := res.RowsAffected()
		fmt.Printf("   Removed %d old news articles.\n", rows)
	}

	// 4. Vacuum full tables to shrink size
	fmt.Println("\n⚡ Reclaiming database space (VACUUM FULL)...")
	_, err = db.Exec("VACUUM FULL jobs")
	if err != nil {
		log.Printf("   VACUUM FULL jobs failed: %v (This is normal if you don't have superuser rights, space will still be reclaimed dynamically)", err)
	} else {
		fmt.Println("   VACUUM FULL jobs completed successfully.")
	}

	_, err = db.Exec("VACUUM FULL news")
	if err != nil {
		log.Printf("   VACUUM FULL news failed: %v", err)
	} else {
		fmt.Println("   VACUUM FULL news completed successfully.")
	}

	fmt.Println("\n✨ Production database cleanup completed successfully!")
}
