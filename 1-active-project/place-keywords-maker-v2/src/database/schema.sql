-- 매장 관리 데이터베이스 스키마

-- 매장 정보 테이블
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, archived
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 크롤링 이력 테이블
CREATE TABLE IF NOT EXISTS crawl_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  place_id TEXT NOT NULL,
  status TEXT NOT NULL, -- success, failed, processing
  error_message TEXT,
  data_file_path TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 수집 데이터 요약 테이블
CREATE TABLE IF NOT EXISTS crawl_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crawl_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,

  -- 기본 정보
  rating REAL,
  review_count INTEGER,
  visitor_review_count INTEGER,
  blog_review_count INTEGER,

  -- 메뉴 정보
  menu_count INTEGER DEFAULT 0,

  -- 경쟁업체 정보
  naver_competitor_count INTEGER DEFAULT 0,
  diningcode_competitor_count INTEGER DEFAULT 0,

  -- 키워드 정보
  keyword_count INTEGER DEFAULT 0,

  -- 외부 플랫폼
  has_diningcode BOOLEAN DEFAULT 0,
  has_catchtable BOOLEAN DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (crawl_id) REFERENCES crawl_history(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 키워드 추적 테이블 (여러 키워드를 추가하고 관리)
CREATE TABLE IF NOT EXISTS tracked_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  place_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, paused, archived
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, keyword),
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 키워드 순위 이력 테이블 (날짜/시간별 순위 누적)
CREATE TABLE IF NOT EXISTS rank_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  place_id TEXT NOT NULL,
  keyword TEXT NOT NULL,

  -- 순위 정보
  rank INTEGER, -- null이면 150위 밖
  page INTEGER,
  position_in_page INTEGER,

  -- 매장 정보 (순위 조회 시점의 스냅샷)
  place_name TEXT,
  category TEXT,
  rating REAL,
  review_count INTEGER,

  -- 검색 설정
  max_pages INTEGER DEFAULT 20,
  max_rank INTEGER DEFAULT 300,

  -- 조회 시각
  checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (keyword_id) REFERENCES tracked_keywords(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stores_place_id ON stores(place_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_crawl_history_store_id ON crawl_history(store_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON crawl_history(status);
CREATE INDEX IF NOT EXISTS idx_crawl_summary_store_id ON crawl_summary(store_id);
CREATE INDEX IF NOT EXISTS idx_tracked_keywords_store_id ON tracked_keywords(store_id);
CREATE INDEX IF NOT EXISTS idx_tracked_keywords_status ON tracked_keywords(status);
CREATE INDEX IF NOT EXISTS idx_rank_history_keyword_id ON rank_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_checked_at ON rank_history(checked_at);
