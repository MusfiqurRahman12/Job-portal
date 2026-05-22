package scraper

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// APIServer serves job data via REST endpoints for the Next.js frontend
type APIServer struct {
	db   *DB
	port string
}

func NewAPIServer(db *DB, port string) *APIServer {
	return &APIServer{db: db, port: port}
}

// corsMiddleware adds CORS headers for the Next.js frontend
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func (s *APIServer) Start() {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/jobs/", corsMiddleware(s.handleJobByID)) // Catch all for /api/jobs/{id}
	mux.HandleFunc("/api/jobs", corsMiddleware(s.handleGetJobs))
	mux.HandleFunc("/api/jobs/count", corsMiddleware(s.handleGetJobCount))
	mux.HandleFunc("/api/jobs/categories", corsMiddleware(s.handleGetCategories))
	mux.HandleFunc("/api/news/", corsMiddleware(s.handleNewsBySlug)) // Catch all for /api/news/{slug}
	mux.HandleFunc("/api/news", corsMiddleware(s.handleGetNews))
	mux.HandleFunc("/api/health", corsMiddleware(s.handleHealth))

	log.Printf("🌐 API Server running on http://localhost:%s", s.port)
	if err := http.ListenAndServe(":"+s.port, mux); err != nil {
		log.Fatalf("API Server failed: %v", err)
	}
}

// GET /api/jobs?limit=20&offset=0&category=Engineering&remote_type=worldwide&search=react
func (s *APIServer) handleGetJobs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	offset, _ := strconv.Atoi(q.Get("offset"))
	if offset < 0 {
		offset = 0
	}

	category := q.Get("category")
	remoteType := q.Get("remote_type")
	search := q.Get("search")

	jobs, err := s.db.GetFilteredJobs(limit, offset, category, remoteType, search)
	if err != nil {
		log.Printf("Error fetching jobs: %v", err)
		http.Error(w, `{"error":"failed to fetch jobs"}`, http.StatusInternalServerError)
		return
	}

	resp := map[string]interface{}{
		"jobs":   jobs,
		"count":  len(jobs),
		"limit":  limit,
		"offset": offset,
	}

	json.NewEncoder(w).Encode(resp)
}

// GET /api/jobs/{id}
func (s *APIServer) handleJobByID(w http.ResponseWriter, r *http.Request) {
	// Simple path routing since we only use basic mux
	path := strings.TrimPrefix(r.URL.Path, "/api/jobs/")
	if path == "" || path == "count" || path == "categories" {
		// Handled by other routes, but if it hits here by mistake, ignore
		return
	}

	job, err := s.db.GetJobByID(path)
	if err != nil {
		http.Error(w, `{"error":"job not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(job)
}

// GET /api/jobs/count
func (s *APIServer) handleGetJobCount(w http.ResponseWriter, r *http.Request) {
	count, err := s.db.GetJobCount()
	if err != nil {
		http.Error(w, `{"error":"failed to get count"}`, http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]int{"count": count})
}

// GET /api/jobs/categories
func (s *APIServer) handleGetCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := s.db.GetCategoryCounts()
	if err != nil {
		http.Error(w, `{"error":"failed to get categories"}`, http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(categories)
}

// GET /api/health
func (s *APIServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"service": "remotehub-api",
	})
}

// GET /api/news?limit=10&offset=0
func (s *APIServer) handleGetNews(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	offset, _ := strconv.Atoi(q.Get("offset"))
	if offset < 0 {
		offset = 0
	}

	newsList, err := s.db.GetNews(limit, offset)
	if err != nil {
		log.Printf("Error fetching news: %v", err)
		http.Error(w, `{"error":"failed to fetch news"}`, http.StatusInternalServerError)
		return
	}

	count, _ := s.db.GetNewsCount()

	resp := map[string]interface{}{
		"news":   newsList,
		"count":  count,
		"limit":  limit,
		"offset": offset,
	}

	json.NewEncoder(w).Encode(resp)
}

// GET /api/news/{slug}
func (s *APIServer) handleNewsBySlug(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/news/")
	if path == "" {
		return
	}

	newsItem, err := s.db.GetNewsBySlug(path)
	if err != nil {
		http.Error(w, `{"error":"news article not found"}`, http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(newsItem)
}

// Ignore unused import warning — strings is used in db queries
var _ = strings.ToLower

