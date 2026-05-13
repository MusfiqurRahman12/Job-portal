package scraper

import (
	"database/sql"
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"time"

	"github.com/lib/pq"
)

type DB struct {
	conn *sql.DB
}

func NewDB(connStr string) (*DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	return &DB{conn: db}, nil
}

// SaveJob inserts a new job with automatic 24-hour expiration
func (db *DB) SaveJob(job shared.Job) error {
	// Set expiration if not already set
	if job.ExpiresAt.IsZero() {
		job.SetExpiration()
	}

	query := `
		INSERT INTO jobs (title, company, company_logo, location, description, source, url, remote_type, category, tags, salary, posted_at, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (url) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			salary = EXCLUDED.salary,
			posted_at = EXCLUDED.posted_at,
			expires_at = EXCLUDED.expires_at,
			is_active = TRUE
	`
	_, err := db.conn.Exec(query,
		job.Title,
		job.Company,
		job.CompanyLogo,
		job.Location,
		job.Description,
		job.Source,
		job.URL,
		job.RemoteType,
		job.Category,
		pq.Array(job.Tags),
		job.Salary,
		job.PostedAt,
		job.ExpiresAt,
		job.IsActive,
	)
	return err
}

// CleanExpiredJobs marks jobs as inactive when they pass the 24-hour window
func (db *DB) CleanExpiredJobs() (int64, error) {
	query := `
		UPDATE jobs 
		SET is_active = FALSE 
		WHERE is_active = TRUE AND expires_at < $1
	`
	result, err := db.conn.Exec(query, time.Now())
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// DeleteExpiredJobs permanently removes jobs that expired more than 7 days ago
func (db *DB) DeleteExpiredJobs() (int64, error) {
	query := `
		DELETE FROM jobs 
		WHERE is_active = FALSE AND expires_at < $1
	`
	result, err := db.conn.Exec(query, time.Now().Add(-7*24*time.Hour))
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// GetActiveJobs returns all non-expired active jobs
func (db *DB) GetActiveJobs(limit, offset int) ([]shared.Job, error) {
	return db.GetFilteredJobs(limit, offset, "", "", "")
}

// GetFilteredJobs returns active non-expired jobs with optional filters
func (db *DB) GetFilteredJobs(limit, offset int, category, remoteType, search string) ([]shared.Job, error) {
	query := `
		SELECT id, title, company, company_logo, location, description, source, url, 
		       remote_type, category, tags, salary, posted_at, expires_at, created_at, is_active
		FROM jobs 
		WHERE is_active = TRUE AND expires_at > $1
	`
	args := []interface{}{time.Now()}
	argIdx := 2

	if category != "" {
		query += fmt.Sprintf(" AND category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	if remoteType != "" {
		query += fmt.Sprintf(" AND remote_type = $%d", argIdx)
		args = append(args, remoteType)
		argIdx++
	}

	if search != "" {
		query += fmt.Sprintf(" AND (title ILIKE $%d OR company ILIKE $%d OR description ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY posted_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []shared.Job
	for rows.Next() {
		var j shared.Job
		err := rows.Scan(
			&j.ID, &j.Title, &j.Company, &j.CompanyLogo, &j.Location, &j.Description,
			&j.Source, &j.URL, &j.RemoteType, &j.Category, pq.Array(&j.Tags),
			&j.Salary, &j.PostedAt, &j.ExpiresAt, &j.CreatedAt, &j.IsActive,
		)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}

// GetJobCount returns the count of active non-expired jobs
func (db *DB) GetJobCount() (int, error) {
	var count int
	err := db.conn.QueryRow(`
		SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND expires_at > $1
	`, time.Now()).Scan(&count)
	return count, err
}

// GetJobByID returns a single job by its ID
func (db *DB) GetJobByID(id string) (shared.Job, error) {
	query := `
		SELECT id, title, company, company_logo, location, description, source, url, 
		       remote_type, category, tags, salary, posted_at, expires_at, created_at, is_active
		FROM jobs 
		WHERE id = $1
	`
	var j shared.Job
	err := db.conn.QueryRow(query, id).Scan(
		&j.ID, &j.Title, &j.Company, &j.CompanyLogo, &j.Location, &j.Description,
		&j.Source, &j.URL, &j.RemoteType, &j.Category, pq.Array(&j.Tags),
		&j.Salary, &j.PostedAt, &j.ExpiresAt, &j.CreatedAt, &j.IsActive,
	)
	return j, err
}

// CategoryCount holds a category name and its job count
type CategoryCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// GetCategoryCounts returns job counts grouped by category
func (db *DB) GetCategoryCounts() ([]CategoryCount, error) {
	query := `
		SELECT category, COUNT(*) as count
		FROM jobs
		WHERE is_active = TRUE AND expires_at > $1
		GROUP BY category
		ORDER BY count DESC
	`
	rows, err := db.conn.Query(query, time.Now())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []CategoryCount
	for rows.Next() {
		var c CategoryCount
		if err := rows.Scan(&c.Name, &c.Count); err != nil {
			return nil, err
		}
		categories = append(categories, c)
	}
	return categories, nil
}

// StartCleanupScheduler runs a background goroutine that cleans expired jobs every hour
func (db *DB) StartCleanupScheduler(stop chan struct{}) {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		// Run once immediately on start
		db.runCleanup()
		for {
			select {
			case <-ticker.C:
				db.runCleanup()
			case <-stop:
				ticker.Stop()
				return
			}
		}
	}()
	log.Println("Job cleanup scheduler started (runs every hour)")
}

func (db *DB) runCleanup() {
	deactivated, err := db.CleanExpiredJobs()
	if err != nil {
		log.Printf("Error cleaning expired jobs: %v", err)
	} else if deactivated > 0 {
		log.Printf("Deactivated %d expired jobs", deactivated)
	}

	deleted, err := db.DeleteExpiredJobs()
	if err != nil {
		log.Printf("Error deleting old expired jobs: %v", err)
	} else if deleted > 0 {
		log.Printf("Permanently deleted %d jobs (expired > 7 days ago)", deleted)
	}
}

func (db *DB) Close() {
	db.conn.Close()
}
