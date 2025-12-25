-- Migration 001: Add new fields for Phase 1-2 data collection
-- Date: 2025-12-05
-- Description: Add SNS links, Naver services, category hierarchy, and SEO keywords fields

-- Add new columns to stores table
ALTER TABLE stores ADD COLUMN category_hierarchy TEXT;
ALTER TABLE stores ADD COLUMN category_codes TEXT; -- JSON array stored as text
ALTER TABLE stores ADD COLUMN seo_keywords TEXT; -- JSON array stored as text

-- SNS links
ALTER TABLE stores ADD COLUMN sns_instagram TEXT;
ALTER TABLE stores ADD COLUMN sns_facebook TEXT;
ALTER TABLE stores ADD COLUMN sns_blog TEXT;
ALTER TABLE stores ADD COLUMN sns_youtube TEXT;
ALTER TABLE stores ADD COLUMN sns_twitter TEXT;

-- Naver services
ALTER TABLE stores ADD COLUMN has_naver_booking BOOLEAN DEFAULT 0;
ALTER TABLE stores ADD COLUMN naver_booking_id TEXT;
ALTER TABLE stores ADD COLUMN has_smart_call BOOLEAN DEFAULT 0;
ALTER TABLE stores ADD COLUMN smart_call_description TEXT;
ALTER TABLE stores ADD COLUMN has_smart_order BOOLEAN DEFAULT 0;
ALTER TABLE stores ADD COLUMN has_place_plus BOOLEAN DEFAULT 0;
ALTER TABLE stores ADD COLUMN has_naver_pay BOOLEAN DEFAULT 0;

-- Category classification
ALTER TABLE stores ADD COLUMN category_type TEXT; -- TYPE_A (서비스업) or TYPE_B (음식점)

-- Last crawl timestamp
ALTER TABLE stores ADD COLUMN last_crawl DATETIME;

-- Create crawl history detail table for change tracking
CREATE TABLE IF NOT EXISTS crawl_history_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawl_id INTEGER NOT NULL,
  place_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crawl_id) REFERENCES crawl_history(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_crawl_history_detail_crawl_id ON crawl_history_detail(crawl_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_detail_place_id ON crawl_history_detail(place_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_detail_field_name ON crawl_history_detail(field_name);
