package shared

import (
	"fmt"
	"hash/fnv"
	"strings"
	"time"
)

// Job represents a single job listing scraped from external sources
type Job struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Company       string    `json:"company"`
	CompanyLogo   string    `json:"company_logo"`
	Location      string    `json:"location"`
	Description   string    `json:"description"`
	Source        string    `json:"source"`
	URL           string    `json:"url"`
	RemoteType    string    `json:"remote_type"`    // "worldwide", "country"
	WorkplaceType string    `json:"workplace_type"` // "remote", "hybrid", "onsite"
	Category      string    `json:"category"`
	Tags          []string  `json:"tags"`
	Salary        string    `json:"salary"`
	PostedAt      time.Time `json:"posted_at"`
	ExpiresAt     time.Time `json:"expires_at"`     // Auto-expires 24h after posted_at
	CreatedAt     time.Time `json:"created_at"`
	IsActive      bool      `json:"is_active"`
}

// DetectWorkplaceType returns "remote", "hybrid", or "onsite" based on text analysis
func DetectWorkplaceType(title, location, description string) string {
	combined := strings.ToLower(title + " " + location + " " + description)
	if strings.Contains(combined, "hybrid") {
		return "hybrid"
	}
	if strings.Contains(combined, "on-site") || strings.Contains(combined, "onsite") ||
		strings.Contains(combined, "in-office") || strings.Contains(combined, "in office") ||
		strings.Contains(combined, "on site") {
		return "onsite"
	}
	return "remote"
}

// SetExpiration sets the expiration to 30 days from now (scrape time) if not already set.
// We use time.Now() instead of PostedAt because many external job boards
// return jobs posted days ago, which would immediately expire if based on PostedAt.
func (j *Job) SetExpiration() {
	if j.PostedAt.IsZero() {
		j.PostedAt = time.Now()
	}
	if j.ExpiresAt.IsZero() {
		j.ExpiresAt = time.Now().Add(30 * 24 * time.Hour)
	}
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

// unsplashPool holds curated pools of high-quality Unsplash photo IDs per topic.
// Each article deterministically picks from the pool using its slug hash, ensuring
// unique images across articles without requiring any API keys.
var unsplashPool = map[string][]string{
	"remote work": {
		"photo-1522202176988-66273c2fd55f", // people collaborating
		"photo-1593642532744-d377ab507dc8", // laptop home setup
		"photo-1586023492125-27b2c045efd7", // cozy home office
		"photo-1617531653332-bd46c16f4d68", // remote worker
		"photo-1588196749597-9ff075ee6b5b", // video call
		"photo-1573496359142-b8d87734a5a2", // woman working remotely
		"photo-1553877522-43269d4ea984", // home desk
		"photo-1434494878577-86c23bcb06b9", // nomad working
		"photo-1496181133206-80ce9b88a853", // laptop outdoor
		"photo-1525547719571-a2d4ac8945e2", // modern workspace
	},
	"tech": {
		"photo-1518770660439-4636190af475", // circuit board
		"photo-1461749280684-dccba630e2f6", // coding screen
		"photo-1555949963-ff9fe0c870eb", // developer coding
		"photo-1550745165-9bc0b252726f", // gaming/tech setup
		"photo-1531297484001-80022131f5a1", // laptop code
		"photo-1504384308090-c894fdcc538d", // server room
		"photo-1519389950473-47ba0277781c", // team tech meeting
		"photo-1498050108023-c5249f4df085", // macbook code
		"photo-1485827404703-89b55fcc595e", // robot AI
		"photo-1526374965328-7f61d4dc18c5", // binary data
	},
	"career": {
		"photo-1507679799987-c73779587ccf", // suited professional
		"photo-1521737604893-d14cc237f11d", // team meeting
		"photo-1454165804606-c3d57bc86b40", // business handshake
		"photo-1542744173-8e7e53415bb0", // job interview
		"photo-1559136555-9303baea8ebd", // office worker
		"photo-1573497019940-1c28c88b4f3e", // woman at work
		"photo-1600880292203-757bb62b4baf", // team collaboration
		"photo-1516321318423-f06f85e504b3", // presentation
		"photo-1568992687947-868a62a9f521", // networking event
		"photo-1486312338219-ce68d2c6f44d", // person typing resume
	},
	"productivity": {
		"photo-1484480974693-6ca0a78fb36b", // notepad planning
		"photo-1507925921958-8a62f3d1a50d", // sticky notes
		"photo-1611532736597-de2d4265fba3", // organized desk
		"photo-1542626991-cbc4e32524cc", // planner
		"photo-1499750310107-5fef28a66643", // coffee and work
		"photo-1434030216411-0b793f4b4173", // person studying
		"photo-1580894894513-541e068a3e2b", // focused work
		"photo-1531537571171-a707bf2683da", // morning routine
		"photo-1513258496099-48168024aec0", // whiteboard planning
		"photo-1512758017271-d7b84c2113f1", // timer focus
	},
	"future of work": {
		"photo-1499951360447-b19be8fe80f5", // abstract future
		"photo-1485827404703-89b55fcc595e", // AI robot
		"photo-1531746790731-6c087fecd65a", // futuristic office
		"photo-1451187580459-43490279c0fa", // global connectivity
		"photo-1620712943543-bcc4688e7485", // AI digital
		"photo-1677442135703-1787eea5ce01", // AI interface
		"photo-1526374965328-7f61d4dc18c5", // data streams
		"photo-1573164713714-d95e436ab8d6", // tech innovation
		"photo-1558494949-ef010cbdcc31", // digital workspace
		"photo-1507003211169-0a1dd7228f2d", // diverse workforce
	},
	"default": {
		"photo-1498050108023-c5249f4df085", // macbook general
		"photo-1516321497487-e288fb19713f", // laptop desk
		"photo-1519389950473-47ba0277781c", // team work
		"photo-1547658719-da2b51169166", // business general
		"photo-1565688534245-05d6b5be184a", // creative work
		"photo-1488190211105-8b0e65b80b4e", // newspaper/blog
		"photo-1455390582262-044cdead277a", // writing blogging
		"photo-1432888498266-38ffec3eaf0a", // content creation
		"photo-1504711434969-e33886168f5c", // office meeting
		"photo-1581291518857-4e27b48ff24e", // modern office
	},
}

// pickFromPool selects an image from the pool deterministically using the article slug.
// This ensures the same article always gets the same image, but different articles
// (even with the same category) get varied images.
func pickFromPool(pool []string, slug string) string {
	h := fnv.New32a()
	h.Write([]byte(slug))
	idx := int(h.Sum32()) % len(pool)
	photoID := pool[idx]
	return fmt.Sprintf("https://images.unsplash.com/%s?q=85&w=1200&h=600&auto=format&fit=crop", photoID)
}

// AssignFallbackImage assigns a category-specific, article-unique Unsplash photo.
// Uses slug-based selection so every article gets a visually distinct image.
func (n *News) AssignFallbackImage() {
	if n.Image != "" {
		return
	}
	pool, ok := unsplashPool[strings.ToLower(n.Category)]
	if !ok || len(pool) == 0 {
		pool = unsplashPool["default"]
	}
	// Use title as fallback key if slug isn't set yet
	key := n.Slug
	if key == "" {
		key = n.Title
	}
	n.Image = pickFromPool(pool, key)
}

// AssignDynamicImage selects a unique, keyword-relevant professional image.
// Tries Unsplash Source first (keyword-based), then falls back to the curated pool.
func (n *News) AssignDynamicImage(keyword string) {
	if n.Image != "" {
		return
	}
	// Generate a stable unique signature from slug + keyword to ensure uniqueness
	// The sig param causes Unsplash Source to return a deterministically different photo
	h := fnv.New32a()
	h.Write([]byte(n.Slug + keyword))
	sig := h.Sum32() % 99999

	// Try to match the keyword to one of our curated pools first
	kwLower := strings.ToLower(keyword)
	for cat, pool := range unsplashPool {
		if strings.Contains(kwLower, cat) || strings.Contains(cat, kwLower) {
			n.Image = pickFromPool(pool, n.Slug+keyword)
			return
		}
	}

	// Default: use Unsplash Source URL with keyword + unique sig for variety
	// Multiple image services used as rotation for maximum variety:
	cleanKw := strings.ReplaceAll(strings.ToLower(keyword), " ", ",")
	_ = fmt.Sprintf("sig=%d", sig) // used below
	switch sig % 3 {
	case 0:
		// Unsplash collection-style URL (free, no key)
		n.Image = fmt.Sprintf("https://images.unsplash.com/photo-%s?q=85&w=1200&h=600&auto=format&fit=crop", unsplashPool["default"][sig%10])
	case 1:
		// LoremFlickr with keyword (backup)
		n.Image = fmt.Sprintf("https://loremflickr.com/1200/600/%s?lock=%d", cleanKw, sig)
	default:
		// Picsum Photos (always works, abstract/nature variety)
		n.Image = fmt.Sprintf("https://picsum.photos/seed/%s-%d/1200/600", cleanKw, sig)
	}
}

