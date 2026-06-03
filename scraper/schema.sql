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
CREATE OR REPLACE VIEW category_counts AS
SELECT category as name, COUNT(*)::int as count
FROM jobs
WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
GROUP BY category;

-- View for system statistics (total scraped/created and active counts)
CREATE OR REPLACE VIEW system_stats_view AS
SELECT 
    (SELECT (CASE WHEN is_called THEN last_value ELSE 0 END)::int FROM jobs_id_seq) as total_jobs,
    (SELECT COUNT(*)::int FROM jobs WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP) as active_jobs,
    (SELECT (CASE WHEN is_called THEN last_value ELSE 0 END)::int FROM news_id_seq) as total_articles,
    (SELECT COUNT(*)::int FROM news) as active_articles;


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
