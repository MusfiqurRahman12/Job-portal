package scraper

import (
	"database/sql"
	"fmt"
	"job-portal-crawler/shared"
	"log"
	"os"
	"sync"
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
	selectQuery := `
		SELECT id, title, company
		FROM jobs
		WHERE is_active = TRUE AND expires_at < NOW() - INTERVAL '24 hours'
	`
	rows, err := db.conn.Query(selectQuery)
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

	if len(jobs) > 0 {
		updateQuery := `
			UPDATE jobs
			SET is_active = FALSE
			WHERE is_active = TRUE AND expires_at < NOW() - INTERVAL '24 hours'
		`
		_, err = db.conn.Exec(updateQuery)
		if err != nil {
			log.Printf("[Cleanup] Warning: failed to update is_active flag for expired jobs: %v", err)
		}
	}

	return jobs, nil
}

// DeleteExpiredJobs permanently removes jobs that have been archived for more than 7 days
// (which corresponds to 8 days total after their application window expires_at passes)
func (db *DB) DeleteExpiredJobs() (int64, error) {
	// Clean up outreach queue records that have no associated job or are older than 30 days
	_, err := db.conn.Exec(`
		DELETE FROM outreach_queue 
		WHERE job_id IS NULL OR created_at < $1
	`, time.Now().Add(-30*24*time.Hour))
	if err != nil {
		log.Printf("[Cleanup] Warning: failed to clean up old outreach queue: %v", err)
	}

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

// DeleteExpiredNews permanently removes news articles that are outside the top 150 most recent articles
func (db *DB) DeleteExpiredNews() (int64, error) {
	query := `
		DELETE FROM news 
		WHERE id NOT IN (
			SELECT id FROM news 
			ORDER BY published_at DESC 
			LIMIT 150
		)
	`
	result, err := db.conn.Exec(query)
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

// GetRecentJobsForContext returns a small set of the most recently posted active jobs to be used as context for AI article generation.
func (db *DB) GetRecentJobsForContext(limit int) ([]shared.Job, error) {
	query := `
		SELECT title, company, category, tags
		FROM jobs
		WHERE is_active = TRUE AND expires_at > $1
		ORDER BY posted_at DESC
		LIMIT $2
	`
	rows, err := db.conn.Query(query, time.Now(), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []shared.Job
	for rows.Next() {
		var j shared.Job
		// We only need title, company, category, and tags for context, so we can ignore the rest
		err := rows.Scan(&j.Title, &j.Company, &j.Category, pq.Array(&j.Tags))
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
	db.RunCleanupSync()
}

// RunCleanupSync deactivates expired jobs, sends Google Indexing deletion notifications synchronously,
// and deletes inactive/expired jobs and old news articles to keep database under 5GB/500MB.
func (db *DB) RunCleanupSync() {
	log.Println("🧹 Starting database cleanup...")

	// 1. Deactivate expired jobs and notify Google Indexing
	expiredJobs, err := db.CleanExpiredJobs()
	if err != nil {
		log.Printf("[Cleanup] ❌ Error cleaning expired jobs: %v", err)
	} else if len(expiredJobs) > 0 {
		log.Printf("[Cleanup] Deactivated %d expired jobs", len(expiredJobs))
		
		var wg sync.WaitGroup
		for _, j := range expiredJobs {
			wg.Add(1)
			go func(jobID int64, title string, company string) {
				defer wg.Done()
				slug := Slugify(fmt.Sprintf("%s %s", title, company))
				jobURL := fmt.Sprintf("https://www.futuretalent.online/jobs/%d-%s", jobID, slug)
				if err := NotifyGoogleIndexing(jobURL, "URL_DELETED"); err != nil {
					log.Printf("[Indexing] ⚠️ Google Indexing API deletion failed for %s: %v", jobURL, err)
				} else {
					log.Printf("[Indexing] ✅ Notified Google Indexing of deletion for: %s", jobURL)
				}
			}(j.ID, j.Title, j.Company)
		}
		wg.Wait()
		log.Println("[Cleanup] Google Indexing deletion notifications complete.")
	}

	// 2. Permanently delete deactivated or expired jobs
	deletedJobs, err := db.DeleteExpiredJobs()
	if err != nil {
		log.Printf("[Cleanup] ❌ Error deleting old expired jobs: %v", err)
	} else if deletedJobs > 0 {
		log.Printf("[Cleanup] Permanently deleted %d inactive/expired jobs", deletedJobs)
	}

	// 3. Permanently delete old news articles (keeping only the top 150)
	deletedNews, err := db.DeleteExpiredNews()
	if err != nil {
		log.Printf("[Cleanup] ❌ Error deleting old news articles: %v", err)
	} else if deletedNews > 0 {
		log.Printf("[Cleanup] Permanently deleted %d old news articles (kept latest 150)", deletedNews)
	}

	log.Println("✨ Database cleanup complete.")
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

type OutreachDraft struct {
	ID           int64
	JobID        int64
	Company      string
	ContactEmail string
	EmailSubject string
	EmailBody    string
	Status       string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// GetJobsLackingOutreach returns up to 50 active, non-expired jobs that do not have an outreach draft generated yet
func (db *DB) GetJobsLackingOutreach() ([]shared.Job, error) {
	query := `
		SELECT j.id, j.title, j.company, j.company_logo, j.location, j.description, j.source, j.url, 
		       j.remote_type, j.workplace_type, j.category, j.tags, j.salary, j.posted_at, j.expires_at, j.created_at, j.is_active
		FROM jobs j
		LEFT JOIN outreach_queue o ON j.id = o.job_id
		WHERE j.is_active = TRUE AND j.expires_at > $1 AND o.id IS NULL
		ORDER BY j.posted_at DESC
		LIMIT 50
	`
	rows, err := db.conn.Query(query, time.Now())
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

// SaveOutreachDraft inserts a new outreach draft into the queue
func (db *DB) SaveOutreachDraft(draft OutreachDraft) error {
	query := `
		INSERT INTO outreach_queue (job_id, company, contact_email, email_subject, email_body, status)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := db.conn.Exec(query,
		draft.JobID,
		draft.Company,
		draft.ContactEmail,
		draft.EmailSubject,
		draft.EmailBody,
		draft.Status,
	)
	return err
}

// GetPendingOutreachDrafts returns all drafts that are pending approval
func (db *DB) GetPendingOutreachDrafts() ([]OutreachDraft, error) {
	query := `
		SELECT id, job_id, company, contact_email, email_subject, email_body, status, created_at, updated_at
		FROM outreach_queue
		WHERE status = 'pending_approval'
		ORDER BY created_at ASC
	`
	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drafts []OutreachDraft
	for rows.Next() {
		var d OutreachDraft
		err := rows.Scan(
			&d.ID, &d.JobID, &d.Company, &d.ContactEmail, &d.EmailSubject, &d.EmailBody, &d.Status, &d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, nil
}

// UpdateOutreachStatus updates a draft's approval status
func (db *DB) UpdateOutreachStatus(id int64, status string) error {
	query := `
		UPDATE outreach_queue
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := db.conn.Exec(query, status, id)
	return err
}

// CreateScraperRun initializes a log entry for a scraper run
func (db *DB) CreateScraperRun(runID string, runNumber int) error {
	query := `
		INSERT INTO scraper_runs (run_id, run_number, status, started_at)
		VALUES ($1, $2, 'running', CURRENT_TIMESTAMP)
		ON CONFLICT (run_id) DO NOTHING
	`
	_, err := db.conn.Exec(query, runID, runNumber)
	return err
}

// UpdateScraperRun updates the final counts and status of a scraper run
func (db *DB) UpdateScraperRun(runID string, jobsAdded, articlesAdded int, status, errMsg string) error {
	query := `
		UPDATE scraper_runs
		SET jobs_added = $1,
		    articles_added = $2,
		    status = $3,
		    error_message = $4,
		    completed_at = CURRENT_TIMESTAMP
		WHERE run_id = $5
	`
	_, err := db.conn.Exec(query, jobsAdded, articlesAdded, status, errMsg, runID)
	return err
}

// GetNextLocalRunNumber returns the next run number for local executions
func (db *DB) GetNextLocalRunNumber() (int, error) {
	var maxNum int
	err := db.conn.QueryRow("SELECT COALESCE(MAX(run_number), 0) FROM scraper_runs").Scan(&maxNum)
	if err != nil {
		return 1, err
	}
	return maxNum + 1, nil
}

// GetScraperSettings fetches all admin-controlled scraper settings as a key-value map.
// Returns defaults if the table doesn't exist or is empty.
func (db *DB) GetScraperSettings() (map[string]string, error) {
	defaults := map[string]string{
		"enable_job_scraping":     "true",
		"enable_article_scraping": "true",
		"article_author":          "FutureTalent",
		"article_seo_format":      "true",
	}

	rows, err := db.conn.Query("SELECT key, value FROM scraper_settings")
	if err != nil {
		// If table doesn't exist yet, return safe defaults
		log.Printf("[Settings] Could not read scraper_settings (table may not exist yet): %v", err)
		return defaults, nil
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			continue
		}
		settings[key] = value
	}

	// Merge defaults for any missing keys
	for k, v := range defaults {
		if _, exists := settings[k]; !exists {
			settings[k] = v
		}
	}

	return settings, nil
}
