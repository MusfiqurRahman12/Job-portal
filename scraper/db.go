package scraper

import (
	"database/sql"
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"os"
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

// InitSchema loads schema.sql and runs it on the database connection
func (db *DB) InitSchema() error {
	schemaBytes, err := os.ReadFile("scraper/schema.sql")
	if err != nil {
		// Try fallback relative path
		schemaBytes, err = os.ReadFile("schema.sql")
		if err != nil {
			return fmt.Errorf("failed to read schema.sql: %w", err)
		}
	}

	_, err = db.conn.Exec(string(schemaBytes))
	if err != nil {
		return fmt.Errorf("failed to execute schema.sql: %w", err)
	}

	log.Println("✨ Database schema successfully initialized (jobs and news tables)")
	return nil
}

// SaveNews inserts or updates a crawled and AI-rewritten news article
func (db *DB) SaveNews(n shared.News) error {
	if n.Slug == "" {
		n.GenerateSlug()
	}
	n.AssignFallbackImage()

	query := `
		INSERT INTO news (title, slug, excerpt, content, category, image, author, url, published_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (url) DO UPDATE SET
			title = EXCLUDED.title,
			slug = EXCLUDED.slug,
			excerpt = EXCLUDED.excerpt,
			content = EXCLUDED.content,
			category = EXCLUDED.category,
			image = EXCLUDED.image,
			author = EXCLUDED.author,
			published_at = EXCLUDED.published_at
	`
	_, err := db.conn.Exec(query,
		n.Title,
		n.Slug,
		n.Excerpt,
		n.Content,
		n.Category,
		n.Image,
		n.Author,
		n.URL,
		n.PublishedAt,
	)
	return err
}

// GetNews returns latest published news articles
func (db *DB) GetNews(limit, offset int) ([]shared.News, error) {
	query := `
		SELECT id, title, slug, excerpt, content, category, image, author, url, published_at, created_at
		FROM news
		ORDER BY published_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := db.conn.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var articles []shared.News
	for rows.Next() {
		var n shared.News
		err := rows.Scan(
			&n.ID, &n.Title, &n.Slug, &n.Excerpt, &n.Content, &n.Category,
			&n.Image, &n.Author, &n.URL, &n.PublishedAt, &n.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		articles = append(articles, n)
	}
	return articles, nil
}

// GetNewsBySlug returns a single news article by its slug
func (db *DB) GetNewsBySlug(slug string) (shared.News, error) {
	query := `
		SELECT id, title, slug, excerpt, content, category, image, author, url, published_at, created_at
		FROM news
		WHERE slug = $1
	`
	var n shared.News
	err := db.conn.QueryRow(query, slug).Scan(
		&n.ID, &n.Title, &n.Slug, &n.Excerpt, &n.Content, &n.Category,
		&n.Image, &n.Author, &n.URL, &n.PublishedAt, &n.CreatedAt,
	)
	return n, err
}

// GetNewsCount returns total number of news articles
func (db *DB) GetNewsCount() (int, error) {
	var count int
	err := db.conn.QueryRow("SELECT COUNT(*) FROM news").Scan(&count)
	return count, err
}

