-- Jobs table with expiration support
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    company_logo TEXT DEFAULT '',
    location TEXT,
    description TEXT,
    source TEXT,
    url TEXT UNIQUE NOT NULL,
    remote_type TEXT DEFAULT 'worldwide',
    workplace_type TEXT DEFAULT 'remote',
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    salary TEXT DEFAULT '',
    posted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Add workplace_type column if it doesn't exist (safe migration)
DO $$ BEGIN
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workplace_type TEXT DEFAULT 'remote';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs(url);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_workplace_type ON jobs(workplace_type);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);

-- Composite index for the most common query: active + not expired
CREATE INDEX IF NOT EXISTS idx_jobs_active_expiry ON jobs(is_active, expires_at DESC);

-- News table with AI rewriting and category categorization
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    image TEXT DEFAULT '',
    author TEXT DEFAULT 'RemoteHub Editorial',
    url TEXT UNIQUE NOT NULL,
    published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
-- View for category counts
DROP VIEW IF EXISTS category_counts CASCADE;
CREATE OR REPLACE VIEW category_counts WITH (security_invoker = true) AS
SELECT category as name, COUNT(*)::int as count
FROM jobs
WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
GROUP BY category;

-- View for system statistics (total scraped/created and active counts)
DROP VIEW IF EXISTS system_stats_view CASCADE;
CREATE OR REPLACE VIEW system_stats_view WITH (security_invoker = true) AS
SELECT 
    (SELECT (CASE WHEN is_called THEN last_value ELSE 0 END)::int FROM jobs_id_seq) as total_jobs,
    (SELECT COUNT(*)::int FROM jobs WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP) as active_jobs,
    (SELECT (CASE WHEN is_called THEN last_value ELSE 0 END)::int FROM news_id_seq) as total_articles,
    (SELECT COUNT(*)::int FROM news) as active_articles,
    (SELECT COUNT(DISTINCT source)::int FROM jobs WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP) as total_sources,
    (SELECT COUNT(DISTINCT COALESCE(NULLIF(regexp_replace(location, '^.*,\s*', ''), ''), location))::int FROM jobs WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP) as total_countries;


-- Subscribers/Newsletter table for job alerts
CREATE TABLE IF NOT EXISTS subscribers (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outreach queue table for AI backlink outreach
CREATE TABLE IF NOT EXISTS outreach_queue (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    company TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    email_subject TEXT NOT NULL,
    email_body TEXT NOT NULL,
    status TEXT DEFAULT 'pending_approval',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scraper runs/execution logging table
CREATE TABLE IF NOT EXISTS scraper_runs (
    id SERIAL PRIMARY KEY,
    run_id TEXT UNIQUE NOT NULL,
    run_number INTEGER,
    jobs_added INTEGER DEFAULT 0,
    articles_added INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running',
    error_message TEXT DEFAULT '',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- View for company profiles (unique companies with active job counts)
DROP VIEW IF EXISTS company_profiles CASCADE;
CREATE OR REPLACE VIEW company_profiles WITH (security_invoker = true) AS
SELECT 
    company as name,
    MAX(company_logo) as logo,
    COUNT(*)::int as open_jobs_count
FROM jobs
WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
GROUP BY company;

-- Social marketing posts table
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    platforms TEXT[] DEFAULT '{}',
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_at TIMESTAMP,
    status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
    logs TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_at);

-- Enable Row Level Security (RLS) on public tables to satisfy linter warnings
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Add SELECT policies to allow public reading of active jobs and articles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' AND policyname = 'Allow public read access on jobs'
    ) THEN
        CREATE POLICY "Allow public read access on jobs" ON jobs FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'news' AND policyname = 'Allow public read access on news'
    ) THEN
        CREATE POLICY "Allow public read access on news" ON news FOR SELECT USING (true);
    END IF;
END
$$;

-- Admin-controlled scraper settings (key-value configuration)
CREATE TABLE IF NOT EXISTS scraper_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings (safe: ON CONFLICT DO NOTHING preserves existing values)
INSERT INTO scraper_settings (key, value, description) VALUES
('enable_job_scraping', 'true', 'Enable automatic scraping and AI rewriting of job listings'),
('enable_article_scraping', 'true', 'Enable automatic scraping and AI rewriting of news/blog articles'),
('article_author', 'FutureTalent', 'Default author name for crawled and AI-rewritten articles'),
('article_seo_format', 'true', 'Enforce structured SEO headings (H1, H2, H3) in rewritten articles')
ON CONFLICT (key) DO NOTHING;
