-- Thin Content Cleanup Script
-- Removes currently active jobs whose descriptions are thin/empty after AI rewrite.
-- Run this ONCE on the production Supabase database to clean up existing bad data.
-- 
-- "Thin content" = jobs with placeholder markers that Gemini inserted when
-- source listings had missing sections, OR very short descriptions (< 300 characters).
--
-- Preview count before deleting (run this SELECT first):
-- SELECT COUNT(*) FROM jobs WHERE is_active = TRUE AND (
--     description ILIKE '%[Company information missing]%'
--     OR description ILIKE '%[Responsibilities missing]%'
--     OR description ILIKE '%[Requirements missing]%'
--     OR description ILIKE '%no specific responsibilities listed%'
--     OR description ILIKE '%no specific requirements listed%'
--     OR description ILIKE '%information not available%'
--     OR LENGTH(TRIM(description)) < 300
-- );

-- Deactivate thin-content jobs (safe — does not permanently delete)
UPDATE jobs
SET is_active = FALSE
WHERE is_active = TRUE
  AND (
    description ILIKE '%[Company information missing]%'
    OR description ILIKE '%[Responsibilities missing]%'
    OR description ILIKE '%[Requirements missing]%'
    OR description ILIKE '%[Benefits missing]%'
    OR description ILIKE '%[Description missing]%'
    OR description ILIKE '%[No description provided]%'
    OR description ILIKE '%[Information not provided]%'
    OR description ILIKE '%no specific responsibilities listed%'
    OR description ILIKE '%no specific requirements listed%'
    OR description ILIKE '%no responsibilities listed%'
    OR description ILIKE '%no requirements listed%'
    OR description ILIKE '%information not available%'
    OR description ILIKE '%not mentioned in the job%'
    OR description ILIKE '%not specified in the job%'
    OR LENGTH(TRIM(description)) < 300
  );
