package main

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		godotenv.Load("../.env")
	}

	dbURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dbURL == "" {
		dbURL = "postgres://postgres:Abcd%401234@localhost:5433/job_portal?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	// Restore job 301 back to active
	res, err := db.Exec("UPDATE jobs SET is_active = true WHERE id = $1", 301)
	if err != nil {
		log.Fatalf("Failed to restore job 301: %v", err)
	}
	rows, _ := res.RowsAffected()
	log.Printf("Restored %d row(s): job 301 set back to active", rows)

	// Restore job 300 back to its standard future expiry
	res2, err := db.Exec("UPDATE jobs SET expires_at = NOW() + INTERVAL '30 days' WHERE id = $1", 300)
	if err != nil {
		log.Fatalf("Failed to restore job 300: %v", err)
	}
	rows2, _ := res2.RowsAffected()
	log.Printf("Restored %d row(s): job 300 expires_at set to 30 days from now", rows2)
}
