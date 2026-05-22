package shared

import (
	"strings"
	"time"
)

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

// SetExpiration sets the expiration to 24 hours from now (scrape time).
// We use time.Now() instead of PostedAt because many external job boards
// return jobs posted days ago, which would immediately expire if based on PostedAt.
func (j *Job) SetExpiration() {
	if j.PostedAt.IsZero() {
		j.PostedAt = time.Now()
	}
	j.ExpiresAt = time.Now().Add(24 * time.Hour)
	j.IsActive = true
}

// IsExpired checks if the job has passed its 24-hour window
func (j *Job) IsExpired() bool {
	return time.Now().After(j.ExpiresAt)
}

// News represents a rewritten and SEO-optimized news article/blog post
type News struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Slug        string    `json:"slug"`
	Excerpt     string    `json:"excerpt"`
	Content     string    `json:"content"`
	Category    string    `json:"category"` // "Remote Work", "Tech", "Career", "Productivity", "Future of Work"
	Image       string    `json:"image"`
	Author      string    `json:"author"`
	URL         string    `json:"url"` // Original source URL
	PublishedAt time.Time `json:"published_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// GenerateSlug creates a URL-safe slug from the title
func (n *News) GenerateSlug() {
	s := strings.ToLower(n.Title)
	s = strings.ReplaceAll(s, " - ", "-")
	s = strings.ReplaceAll(s, " ", "-")
	// Remove punctuation and special characters
	var sb strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			sb.WriteRune(r)
		}
	}
	n.Slug = sb.String()
}

// AssignFallbackImage maps standard categories to beautiful, premium Unsplash images
func (n *News) AssignFallbackImage() {
	if n.Image != "" {
		return
	}
	switch strings.ToLower(n.Category) {
	case "remote work":
		n.Image = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1000&auto=format&fit=crop"
	case "tech":
		n.Image = "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
	case "career":
		n.Image = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1000&auto=format&fit=crop"
	case "productivity":
		n.Image = "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=1000&auto=format&fit=crop"
	case "future of work":
		n.Image = "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?q=80&w=1000&auto=format&fit=crop"
	default:
		n.Image = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1000&auto=format&fit=crop"
	}
}

