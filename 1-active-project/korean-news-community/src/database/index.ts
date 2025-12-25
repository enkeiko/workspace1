import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { SCHEMA, DEFAULT_TAGS, DEFAULT_BLOCKED_WORDS } from './schema';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;
  
  // 데이터베이스 디렉토리 생성
  const dbDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(config.databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  return db;
}

export function initializeDatabase(): void {
  const database = getDatabase();
  
  // 스키마 실행
  database.exec(SCHEMA);
  
  // 기본 태그 삽입
  const insertTag = database.prepare(`
    INSERT OR IGNORE INTO tags (name, category) VALUES (?, ?)
  `);
  
  for (const tag of DEFAULT_TAGS) {
    insertTag.run(tag.name, tag.category);
  }
  
  // 기본 차단 단어 삽입
  const insertBlockedWord = database.prepare(`
    INSERT OR IGNORE INTO blocked_words (word) VALUES (?)
  `);
  
  for (const word of DEFAULT_BLOCKED_WORDS) {
    insertBlockedWord.run(word);
  }
  
  console.log('✅ 데이터베이스 초기화 완료');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Article 관련 함수들
export interface Article {
  id?: number;
  external_id?: string;
  category: string;
  title: string;
  summary?: string;
  content?: string;
  source_name?: string;
  source_url?: string;
  original_url: string;
  thumbnail_url?: string;
  author?: string;
  published_at?: string;
  practicality_score?: number;
  profit_potential_score?: number;
  scalability_score?: number;
  total_score?: number;
  tags?: string;
  action_idea?: string;
  is_published?: number;
  is_featured?: number;
  is_user_submitted?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
}

export const ArticleRepository = {
  insert(article: Article): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO articles (
        external_id, category, title, summary, content,
        source_name, source_url, original_url, thumbnail_url, author,
        published_at, practicality_score, profit_potential_score,
        scalability_score, total_score, tags, action_idea
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      article.external_id || null,
      article.category,
      article.title,
      article.summary || null,
      article.content || null,
      article.source_name || null,
      article.source_url || null,
      article.original_url,
      article.thumbnail_url || null,
      article.author || null,
      article.published_at || null,
      article.practicality_score || 0,
      article.profit_potential_score || 0,
      article.scalability_score || 0,
      article.total_score || 0,
      article.tags || null,
      article.action_idea || null
    );
    
    return result.lastInsertRowid as number;
  },
  
  findById(id: number): Article | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined;
  },
  
  findByUrl(url: string): Article | undefined {
    const db = getDatabase();
    return db.prepare('SELECT * FROM articles WHERE original_url = ?').get(url) as Article | undefined;
  },
  
  findByCategory(
    category: string,
    options: { limit?: number; offset?: number; orderBy?: string } = {}
  ): Article[] {
    const db = getDatabase();
    const { limit = 20, offset = 0, orderBy = 'published_at DESC' } = options;
    
    return db.prepare(`
      SELECT * FROM articles 
      WHERE category = ? AND is_published = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(category, limit, offset) as Article[];
  },
  
  findFeatured(category?: string): Article[] {
    const db = getDatabase();
    if (category) {
      return db.prepare(`
        SELECT * FROM articles 
        WHERE is_featured = 1 AND category = ? AND is_published = 1
        ORDER BY total_score DESC
        LIMIT 5
      `).all(category) as Article[];
    }
    return db.prepare(`
      SELECT * FROM articles 
      WHERE is_featured = 1 AND is_published = 1
      ORDER BY total_score DESC
      LIMIT 10
    `).all() as Article[];
  },
  
  findPopular(category: string, limit = 10): Article[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM articles 
      WHERE category = ? AND is_published = 1
      ORDER BY (like_count * 2 + comment_count + view_count * 0.1) DESC
      LIMIT ?
    `).all(category, limit) as Article[];
  },
  
  search(query: string, category?: string): Article[] {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    
    if (category) {
      return db.prepare(`
        SELECT * FROM articles 
        WHERE (title LIKE ? OR summary LIKE ? OR tags LIKE ?)
        AND category = ? AND is_published = 1
        ORDER BY total_score DESC
        LIMIT 50
      `).all(searchTerm, searchTerm, searchTerm, category) as Article[];
    }
    
    return db.prepare(`
      SELECT * FROM articles 
      WHERE (title LIKE ? OR summary LIKE ? OR tags LIKE ?)
      AND is_published = 1
      ORDER BY total_score DESC
      LIMIT 50
    `).all(searchTerm, searchTerm, searchTerm) as Article[];
  },
  
  incrementViewCount(id: number): void {
    const db = getDatabase();
    db.prepare('UPDATE articles SET view_count = view_count + 1 WHERE id = ?').run(id);
  },
  
  updateFeatured(id: number, isFeatured: boolean): void {
    const db = getDatabase();
    db.prepare('UPDATE articles SET is_featured = ? WHERE id = ?').run(isFeatured ? 1 : 0, id);
  },
  
  delete(id: number): void {
    const db = getDatabase();
    db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  },
  
  getRecentByTimeRange(hoursAgo: number, category?: string): Article[] {
    const db = getDatabase();
    const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    if (category) {
      return db.prepare(`
        SELECT * FROM articles 
        WHERE collected_at >= ? AND category = ? AND is_published = 1
        ORDER BY total_score DESC
      `).all(since, category) as Article[];
    }
    
    return db.prepare(`
      SELECT * FROM articles 
      WHERE collected_at >= ? AND is_published = 1
      ORDER BY total_score DESC
    `).all(since) as Article[];
  }
};

// Comment 관련 함수들
export interface Comment {
  id?: number;
  article_id: number;
  parent_id?: number;
  user_uuid: string;
  nickname: string;
  content: string;
  like_count?: number;
  is_deleted?: number;
  created_at?: string;
}

export const CommentRepository = {
  insert(comment: Comment): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO comments (article_id, parent_id, user_uuid, nickname, content)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      comment.article_id,
      comment.parent_id || null,
      comment.user_uuid,
      comment.nickname,
      comment.content
    );
    
    return result.lastInsertRowid as number;
  },
  
  findByArticleId(
    articleId: number,
    options: { orderBy?: 'recent' | 'popular' } = {}
  ): Comment[] {
    const db = getDatabase();
    const { orderBy = 'recent' } = options;
    
    const order = orderBy === 'popular' ? 'like_count DESC, created_at DESC' : 'created_at DESC';
    
    return db.prepare(`
      SELECT * FROM comments 
      WHERE article_id = ? AND is_deleted = 0 AND is_spam = 0
      ORDER BY ${order}
    `).all(articleId) as Comment[];
  },
  
  delete(id: number): void {
    const db = getDatabase();
    db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?').run(id);
  },
  
  markAsSpam(id: number): void {
    const db = getDatabase();
    db.prepare('UPDATE comments SET is_spam = 1 WHERE id = ?').run(id);
  }
};

// Like 관련 함수들
export const LikeRepository = {
  likeArticle(articleId: number, userUuid: string): boolean {
    const db = getDatabase();
    try {
      db.prepare(`
        INSERT INTO article_likes (article_id, user_uuid) VALUES (?, ?)
      `).run(articleId, userUuid);
      return true;
    } catch {
      return false;
    }
  },
  
  unlikeArticle(articleId: number, userUuid: string): boolean {
    const db = getDatabase();
    const result = db.prepare(`
      DELETE FROM article_likes WHERE article_id = ? AND user_uuid = ?
    `).run(articleId, userUuid);
    return result.changes > 0;
  },
  
  hasLikedArticle(articleId: number, userUuid: string): boolean {
    const db = getDatabase();
    const result = db.prepare(`
      SELECT 1 FROM article_likes WHERE article_id = ? AND user_uuid = ?
    `).get(articleId, userUuid);
    return !!result;
  },
  
  likeComment(commentId: number, userUuid: string): boolean {
    const db = getDatabase();
    try {
      db.prepare(`
        INSERT INTO comment_likes (comment_id, user_uuid) VALUES (?, ?)
      `).run(commentId, userUuid);
      return true;
    } catch {
      return false;
    }
  },
  
  unlikeComment(commentId: number, userUuid: string): boolean {
    const db = getDatabase();
    const result = db.prepare(`
      DELETE FROM comment_likes WHERE comment_id = ? AND user_uuid = ?
    `).run(commentId, userUuid);
    return result.changes > 0;
  }
};

// Submission 관련 함수들
export interface Submission {
  id?: number;
  user_uuid: string;
  category: string;
  title: string;
  url: string;
  description?: string;
  submitter_nickname?: string;
  status?: string;
}

export const SubmissionRepository = {
  insert(submission: Submission): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO submissions (user_uuid, category, title, url, description, submitter_nickname)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      submission.user_uuid,
      submission.category,
      submission.title,
      submission.url,
      submission.description || null,
      submission.submitter_nickname || '익명'
    );
    
    return result.lastInsertRowid as number;
  },
  
  findPending(): Submission[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM submissions WHERE status = 'pending' ORDER BY created_at DESC
    `).all() as Submission[];
  },
  
  approve(id: number, articleId: number): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE submissions SET status = 'approved', article_id = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(articleId, id);
  },
  
  reject(id: number, note?: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE submissions SET status = 'rejected', admin_note = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(note || null, id);
  }
};

// Update Log 관련 함수들
export const UpdateLogRepository = {
  insert(log: {
    update_time: string;
    articles_collected: number;
    articles_ai_vibe: number;
    articles_local_biz: number;
    status?: string;
    error_message?: string;
  }): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO update_logs (update_time, articles_collected, articles_ai_vibe, articles_local_biz, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      log.update_time,
      log.articles_collected,
      log.articles_ai_vibe,
      log.articles_local_biz,
      log.status || 'success',
      log.error_message || null
    );
  },
  
  getRecent(limit = 10): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM update_logs ORDER BY created_at DESC LIMIT ?
    `).all(limit);
  }
};

// Blocked Words 관련 함수들
export const BlockedWordRepository = {
  getAll(): string[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT word FROM blocked_words').all() as { word: string }[];
    return rows.map(r => r.word);
  },
  
  add(word: string): boolean {
    const db = getDatabase();
    try {
      db.prepare('INSERT INTO blocked_words (word) VALUES (?)').run(word);
      return true;
    } catch {
      return false;
    }
  },
  
  remove(word: string): boolean {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM blocked_words WHERE word = ?').run(word);
    return result.changes > 0;
  }
};

