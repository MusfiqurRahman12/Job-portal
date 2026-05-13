package shared

import "time"

// Job represents a single job listing scraped from external sources
type Job struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Company     string    `json:"company"`
	CompanyLogo string    `json:"company_logo"`
	Location    string    `json:"location"`
	Description string    `json:"description"`
	Source      string    `json:"source"`
	URL         string    `json:"url"`
	RemoteType  string    `json:"remote_type"` // "worldwide", "country", "hybrid"
	Category    string    `json:"category"`
	Tags        []string  `json:"tags"`
	Salary      string    `json:"salary"`
	PostedAt    time.Time `json:"posted_at"`
	ExpiresAt   time.Time `json:"expires_at"`  // Auto-expires 24h after posted_at
	CreatedAt   time.Time `json:"created_at"`
	IsActive    bool      `json:"is_active"`
}

// SetExpiration sets the expiration to 24 hours after posting
func (j *Job) SetExpiration() {
	if j.PostedAt.IsZero() {
		j.PostedAt = time.Now()
	}
	j.ExpiresAt = j.PostedAt.Add(24 * time.Hour)
	j.IsActive = true
}

// IsExpired checks if the job has passed its 24-hour window
func (j *Job) IsExpired() bool {
	return time.Now().After(j.ExpiresAt)
}
