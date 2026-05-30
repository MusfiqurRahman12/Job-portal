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

// SaveJob inserts a new job with automatic 24-hour expiration and returns its ID
func (db *DB) SaveJob(job shared.Job) (int64, error) {
	// Set expiration if not already set
	if job.ExpiresAt.IsZero() {
		job.SetExpiration()
	}

	query := `
		INSERT INTO jobs (title, company, company_logo, location, description, source, url, remote_type, workplace_type, category, tags, salary, posted_at, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		ON CONFLICT (url) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			salary = EXCLUDED.salary,
			workplace_type = EXCLUDED.workplace_type,
			posted_at = EXCLUDED.posted_at,
			expires_at = EXCLUDED.expires_at,
			is_active = TRUE
		RETURNING id
	`
	var insertedID int64
	err := db.conn.QueryRow(query,
		job.Title,
		job.Company,
		job.CompanyLogo,
		job.Location,
		job.Description,
		job.Source,
		job.URL,
		job.RemoteType,
		job.WorkplaceType,
		job.Category,
		pq.Array(job.Tags),
		job.Salary,
		job.PostedAt,
		job.ExpiresAt,
		job.IsActive,
	).Scan(&insertedID)
	
	if err != nil {
		return 0, err
	}
	return insertedID, nil
}

type ExpiredJobInfo struct {
	ID      int64
	Title   string
	Company string
}

// CleanExpiredJobs marks jobs as inactive 24 hours after they pass the application window (expires_at) and returns deactivated job details
func (db *DB) CleanExpiredJobs() ([]ExpiredJobInfo, error) {
	query := `
		UPDATE jobs 
		SET is_active = FALSE 
		WHERE is_active = TRUE AND expires_at < $1
		RETURNING id, title, company
	`
	rows, err := db.conn.Query(query, time.Now().Add(-24*time.Hour))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []ExpiredJobInfo
	for rows.Next() {
		var j ExpiredJobInfo
		if err := rows.Scan(&j.ID, &j.Title, &j.Company); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, nil
}

// DeleteExpiredJobs permanently removes jobs that have been archived for more than 7 days
// (which corresponds to 8 days total after their application window expires_at passes)
func (db *DB) DeleteExpiredJobs() (int64, error) {
	query := `
		DELETE FROM jobs 
		WHERE is_active = FALSE AND expires_at < $1
	`
	result, err := db.conn.Exec(query, time.Now().Add(-8*24*time.Hour))
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
		       remote_type, workplace_type, category, tags, salary, posted_at, expires_at, created_at, is_active
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
			&j.Source, &j.URL, &j.RemoteType, &j.WorkplaceType, &j.Category, pq.Array(&j.Tags),
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
		       remote_type, workplace_type, category, tags, salary, posted_at, expires_at, created_at, is_active
		FROM jobs 
		WHERE id = $1
	`
	var j shared.Job
	err := db.conn.QueryRow(query, id).Scan(
		&j.ID, &j.Title, &j.Company, &j.CompanyLogo, &j.Location, &j.Description,
		&j.Source, &j.URL, &j.RemoteType, &j.WorkplaceType, &j.Category, pq.Array(&j.Tags),
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
	expiredJobs, err := db.CleanExpiredJobs()
	if err != nil {
		log.Printf("Error cleaning expired jobs: %v", err)
	} else if len(expiredJobs) > 0 {
		log.Printf("Deactivated %d expired jobs", len(expiredJobs))
		for _, j := range expiredJobs {
			go func(jobID int64, title string, company string) {
				slug := Slugify(fmt.Sprintf("%s %s", title, company))
				jobURL := fmt.Sprintf("https://futuretalent.com/jobs/%d-%s", jobID, slug)
				if err := NotifyGoogleIndexing(jobURL, "URL_DELETED"); err != nil {
					log.Printf("[Indexing] ⚠️ Google Indexing API deletion failed for %s: %v", jobURL, err)
				}
			}(j.ID, j.Title, j.Company)
		}
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

// JobURLExists checks if a job with the given URL already exists in the database.
// Used to deduplicate before sending to Gemini AI (saves API quota).
func (db *DB) JobURLExists(url string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM jobs WHERE url = $1)`
	err := db.conn.QueryRow(query, url).Scan(&exists)
	return exists, err
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

