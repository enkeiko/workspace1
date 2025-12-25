// Database Schema Definition
// SQLite 기반, 향후 PostgreSQL 확장 가능

export const SCHEMA = `
-- 기사/뉴스 테이블
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('ai-vibe', 'local-biz')),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source_name TEXT,
  source_url TEXT,
  original_url TEXT UNIQUE,
  thumbnail_url TEXT,
  author TEXT,
  published_at DATETIME,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- 스코어링
  practicality_score REAL DEFAULT 0,
  profit_potential_score REAL DEFAULT 0,
  scalability_score REAL DEFAULT 0,
  total_score REAL DEFAULT 0,
  
  -- 메타데이터
  tags TEXT, -- JSON array
  action_idea TEXT, -- 한 줄 액션 아이디어
  
  -- 상태
  is_published INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  is_user_submitted INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  
  -- 통계
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 제출 기사 테이블
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uuid TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('ai-vibe', 'local-biz')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  submitter_nickname TEXT,
  
  -- 상태
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  
  -- 승인 후 연결된 article_id
  article_id INTEGER REFERENCES articles(id),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME
);

-- 댓글 테이블
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_uuid TEXT NOT NULL,
  nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- 통계
  like_count INTEGER DEFAULT 0,
  
  -- 상태
  is_deleted INTEGER DEFAULT 0,
  is_spam INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 좋아요 테이블 (기사)
CREATE TABLE IF NOT EXISTS article_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_uuid TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(article_id, user_uuid)
);

-- 좋아요 테이블 (댓글)
CREATE TABLE IF NOT EXISTS comment_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_uuid TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_uuid)
);

-- 태그 테이블
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT CHECK(category IN ('ai-vibe', 'local-biz', 'both')),
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기사-태그 연결 테이블
CREATE TABLE IF NOT EXISTS article_tags (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- 업데이트 로그 테이블
CREATE TABLE IF NOT EXISTS update_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  update_time TEXT NOT NULL,
  articles_collected INTEGER DEFAULT 0,
  articles_ai_vibe INTEGER DEFAULT 0,
  articles_local_biz INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 차단 단어 테이블
CREATE TABLE IF NOT EXISTS blocked_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_total_score ON articles(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_articles_is_featured ON articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_like_count ON comments(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- 트리거: 댓글 수 업데이트
CREATE TRIGGER IF NOT EXISTS update_comment_count_insert
AFTER INSERT ON comments
BEGIN
  UPDATE articles SET comment_count = comment_count + 1 WHERE id = NEW.article_id;
END;

CREATE TRIGGER IF NOT EXISTS update_comment_count_delete
AFTER DELETE ON comments
BEGIN
  UPDATE articles SET comment_count = comment_count - 1 WHERE id = OLD.article_id;
END;

-- 트리거: 기사 좋아요 수 업데이트
CREATE TRIGGER IF NOT EXISTS update_article_like_count_insert
AFTER INSERT ON article_likes
BEGIN
  UPDATE articles SET like_count = like_count + 1 WHERE id = NEW.article_id;
END;

CREATE TRIGGER IF NOT EXISTS update_article_like_count_delete
AFTER DELETE ON article_likes
BEGIN
  UPDATE articles SET like_count = like_count - 1 WHERE id = OLD.article_id;
END;

-- 트리거: 댓글 좋아요 수 업데이트
CREATE TRIGGER IF NOT EXISTS update_comment_like_count_insert
AFTER INSERT ON comment_likes
BEGIN
  UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
END;

CREATE TRIGGER IF NOT EXISTS update_comment_like_count_delete
AFTER DELETE ON comment_likes
BEGIN
  UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
END;
`;

// 기본 태그 삽입
export const DEFAULT_TAGS = [
  // AI/바이브코딩 태그
  { name: 'AI', category: 'ai-vibe' },
  { name: '자동화', category: 'ai-vibe' },
  { name: 'ChatGPT', category: 'ai-vibe' },
  { name: '바이브코딩', category: 'ai-vibe' },
  { name: 'SaaS', category: 'ai-vibe' },
  { name: '노코드', category: 'ai-vibe' },
  { name: '수익화', category: 'ai-vibe' },
  { name: '부업', category: 'ai-vibe' },
  { name: 'AI마케팅', category: 'ai-vibe' },
  { name: '프롬프트', category: 'ai-vibe' },
  { name: '생성형AI', category: 'ai-vibe' },
  { name: '워크플로우', category: 'ai-vibe' },
  
  // 자영업/네이버 플레이스 태그
  { name: '자영업', category: 'local-biz' },
  { name: '네이버플레이스', category: 'local-biz' },
  { name: '리뷰마케팅', category: 'local-biz' },
  { name: '로컬SEO', category: 'local-biz' },
  { name: '매출', category: 'local-biz' },
  { name: '오프라인', category: 'local-biz' },
  { name: '단골', category: 'local-biz' },
  { name: '상권', category: 'local-biz' },
  { name: '배달', category: 'local-biz' },
  { name: '예약', category: 'local-biz' },
  
  // 공통 태그
  { name: '마케팅', category: 'both' },
  { name: '트렌드', category: 'both' },
  { name: '전략', category: 'both' },
  { name: '실전팁', category: 'both' },
];

// 기본 차단 단어
export const DEFAULT_BLOCKED_WORDS = [
  '스팸', '광고', '홍보', '도박', '카지노', '대출', '불법',
];

