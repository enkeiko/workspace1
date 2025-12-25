/**
 * 매장 관리 데이터베이스
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StoreDatabase {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(__dirname, '../../data/stores.db');
    this.db = null;
  }

  /**
   * 데이터베이스 초기화
   */
  initialize() {
    // 데이터 디렉토리 생성
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // DB 연결
    this.db = new Database(this.dbPath);

    // 스키마 로드
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // 스키마 실행
    this.db.exec(schema);

    // 마이그레이션 실행
    this.runMigrations();

    console.log('[DB] Database initialized at:', this.dbPath);
  }

  /**
   * 마이그레이션 실행
   */
  runMigrations() {
    // 마이그레이션 테이블 생성
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const appliedMigrations = this.db
      .prepare('SELECT migration_name FROM schema_migrations')
      .all()
      .map(row => row.migration_name);

    const allMigrations = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const pendingMigrations = allMigrations.filter(
      m => !appliedMigrations.includes(m)
    );

    for (const migration of pendingMigrations) {
      const migrationPath = path.join(migrationsDir, migration);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          this.db.exec(statement);
        } catch (error) {
          if (!error.message.includes('duplicate column name')) {
            console.error(`[DB] Migration error in ${migration}:`, error.message);
          }
        }
      }

      this.db.prepare('INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES (?)').run(migration);
      console.log(`[DB] Applied migration: ${migration}`);
    }
  }

  /**
   * 매장 추가
   */
  addStore(storeData) {
    const stmt = this.db.prepare(`
      INSERT INTO stores (place_id, name, category, address, phone, notes)
      VALUES (@placeId, @name, @category, @address, @phone, @notes)
    `);

    const result = stmt.run({
      placeId: storeData.placeId,
      name: storeData.name,
      category: storeData.category || null,
      address: storeData.address || null,
      phone: storeData.phone || null,
      notes: storeData.notes || null,
    });

    return result.lastInsertRowid;
  }

  /**
   * 매장 목록 조회
   */
  getStores(filters = {}) {
    let query = 'SELECT * FROM stores';
    const conditions = [];
    const params = {};

    if (filters.status) {
      conditions.push('status = @status');
      params.status = filters.status;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(params);
  }

  /**
   * 매장 상세 조회
   */
  getStore(placeId) {
    const stmt = this.db.prepare('SELECT * FROM stores WHERE place_id = ?');
    return stmt.get(placeId);
  }

  /**
   * 매장 업데이트
   */
  updateStore(placeId, updates) {
    const fields = [];
    const params = { placeId };

    const allowedFields = [
      'name', 'category', 'address', 'phone', 'status', 'notes',
      'category_hierarchy', 'category_codes', 'seo_keywords',
      'sns_instagram', 'sns_facebook', 'sns_blog', 'sns_youtube', 'sns_twitter',
      'has_naver_booking', 'naver_booking_id', 'has_smart_call', 'smart_call_description',
      'has_smart_order', 'has_place_plus', 'has_naver_pay',
      'category_type', 'last_crawl'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = @${field}`);
        params[field] = updates[field];
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE stores SET ${fields.join(', ')} WHERE place_id = @placeId`;
    const stmt = this.db.prepare(query);
    return stmt.run(params);
  }

  /**
   * 크롤링 데이터로 매장 업데이트
   */
  updateStoreFromCrawlData(placeId, data) {
    const updates = {
      name: data.basic?.name,
      category: data.basic?.category,
      address: data.basic?.address?.road || data.basic?.address?.jibun,
      phone: data.basic?.phone,
      last_crawl: new Date().toISOString()
    };

    // SEO 키워드
    if (data.basic?.seoKeywords && Array.isArray(data.basic.seoKeywords)) {
      updates.seo_keywords = JSON.stringify(data.basic.seoKeywords);
    }

    // 카테고리 정보
    if (data.categoryHierarchy) {
      updates.category_hierarchy = data.categoryHierarchy;
    }
    if (data.categoryType) {
      updates.category_type = data.categoryType;
    }
    if (data.mappedCategoryCodes && Array.isArray(data.mappedCategoryCodes)) {
      updates.category_codes = JSON.stringify(data.mappedCategoryCodes);
    } else if (data.categoryCodeList && Array.isArray(data.categoryCodeList)) {
      updates.category_codes = JSON.stringify(data.categoryCodeList);
    }

    // SNS 링크
    if (data.basic?.sns) {
      updates.sns_instagram = data.basic.sns.instagram || null;
      updates.sns_facebook = data.basic.sns.facebook || null;
      updates.sns_blog = data.basic.sns.blog || null;
      updates.sns_youtube = data.basic.sns.youtube || null;
      updates.sns_twitter = data.basic.sns.twitter || null;
    }

    // 네이버 서비스
    if (data.naverServices) {
      updates.has_naver_booking = data.naverServices.booking?.enabled ? 1 : 0;
      updates.naver_booking_id = data.naverServices.booking?.businessId || null;
      updates.has_smart_call = data.naverServices.smartCall?.enabled ? 1 : 0;
      updates.smart_call_description = data.naverServices.smartCall?.description || null;
      updates.has_smart_order = data.naverServices.smartOrder?.enabled ? 1 : 0;
      updates.has_place_plus = data.naverServices.placePlus?.enabled ? 1 : 0;
      updates.has_naver_pay = data.naverServices.naverPay?.enabled ? 1 : 0;
    }

    return this.updateStore(placeId, updates);
  }

  /**
   * 매장 삭제
   */
  deleteStore(placeId) {
    const stmt = this.db.prepare('DELETE FROM stores WHERE place_id = ?');
    return stmt.run(placeId);
  }

  /**
   * 크롤링 이력 추가
   */
  addCrawlHistory(crawlData) {
    // store_id 조회
    const store = this.getStore(crawlData.placeId);
    if (!store) {
      throw new Error(`Store not found: ${crawlData.placeId}`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO crawl_history (
        store_id, place_id, status, error_message,
        data_file_path, started_at, completed_at
      )
      VALUES (@storeId, @placeId, @status, @errorMessage,
        @dataFilePath, @startedAt, @completedAt)
    `);

    const result = stmt.run({
      storeId: store.id,
      placeId: crawlData.placeId,
      status: crawlData.status,
      errorMessage: crawlData.errorMessage || null,
      dataFilePath: crawlData.dataFilePath || null,
      startedAt: crawlData.startedAt || new Date().toISOString(),
      completedAt: crawlData.completedAt || null,
    });

    return result.lastInsertRowid;
  }

  /**
   * 크롤링 이력 업데이트
   */
  updateCrawlHistory(crawlId, updates) {
    const fields = [];
    const params = { crawlId };

    const allowedFields = ['status', 'error_message', 'data_file_path', 'completed_at'];

    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (updates[camelField] !== undefined) {
        fields.push(`${field} = @${camelField}`);
        params[camelField] = updates[camelField];
      }
    }

    if (fields.length === 0) {
      return { changes: 0 };
    }

    const query = `UPDATE crawl_history SET ${fields.join(', ')} WHERE id = @crawlId`;
    const stmt = this.db.prepare(query);
    return stmt.run(params);
  }

  /**
   * 매장별 최근 크롤링 이력 조회
   */
  getLatestCrawlHistory(placeId) {
    const stmt = this.db.prepare(`
      SELECT * FROM crawl_history
      WHERE place_id = ?
      ORDER BY started_at DESC
      LIMIT 1
    `);
    return stmt.get(placeId);
  }

  /**
   * 매장별 전체 크롤링 이력 조회
   */
  getCrawlHistory(placeId, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM crawl_history
      WHERE place_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `);
    return stmt.all(placeId, limit);
  }

  /**
   * 크롤링 요약 추가
   */
  addCrawlSummary(summaryData) {
    const stmt = this.db.prepare(`
      INSERT INTO crawl_summary (
        crawl_id, store_id, rating, review_count, visitor_review_count,
        blog_review_count, menu_count, naver_competitor_count,
        diningcode_competitor_count, keyword_count, has_diningcode, has_catchtable
      )
      VALUES (
        @crawlId, @storeId, @rating, @reviewCount, @visitorReviewCount,
        @blogReviewCount, @menuCount, @naverCompetitorCount,
        @diningcodeCompetitorCount, @keywordCount, @hasDiningcode, @hasCatchtable
      )
    `);

    return stmt.run(summaryData);
  }

  /**
   * 매장별 최근 요약 데이터 조회
   */
  getLatestSummary(placeId) {
    const stmt = this.db.prepare(`
      SELECT cs.*, ch.started_at
      FROM crawl_summary cs
      JOIN crawl_history ch ON cs.crawl_id = ch.id
      WHERE ch.place_id = ?
      ORDER BY ch.started_at DESC
      LIMIT 1
    `);
    return stmt.get(placeId);
  }

  /**
   * 전체 통계
   */
  getOverallStats() {
    const stats = {
      totalStores: 0,
      activeStores: 0,
      totalCrawls: 0,
      successfulCrawls: 0,
      failedCrawls: 0,
    };

    // 매장 통계
    const storeStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM stores
    `).get();

    stats.totalStores = storeStats.total;
    stats.activeStores = storeStats.active;

    // 크롤링 통계
    const crawlStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM crawl_history
    `).get();

    stats.totalCrawls = crawlStats.total;
    stats.successfulCrawls = crawlStats.success;
    stats.failedCrawls = crawlStats.failed;

    return stats;
  }

  /**
   * 매장별 상세 통계 (최근 크롤링 포함)
   */
  getStoresWithLatestCrawl() {
    const stmt = this.db.prepare(`
      SELECT
        s.*,
        ch.id as crawl_id,
        ch.status as crawl_status,
        ch.started_at as last_crawled_at,
        cs.rating,
        cs.review_count,
        cs.naver_competitor_count,
        cs.diningcode_competitor_count,
        cs.menu_count,
        cs.keyword_count
      FROM stores s
      LEFT JOIN (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY started_at DESC) as rn
        FROM crawl_history
      ) ch ON s.id = ch.store_id AND ch.rn = 1
      LEFT JOIN crawl_summary cs ON ch.id = cs.crawl_id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);

    return stmt.all();
  }

  // ===================================
  // 키워드 순위 추적 메서드
  // ===================================

  /**
   * 추적할 키워드 추가
   */
  addTrackedKeyword(storeId, placeId, keyword) {
    const stmt = this.db.prepare(`
      INSERT INTO tracked_keywords (store_id, place_id, keyword)
      VALUES (?, ?, ?)
      ON CONFLICT(store_id, keyword) DO UPDATE SET
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `);

    const result = stmt.run(storeId, placeId, keyword);
    return result.lastInsertRowid;
  }

  /**
   * 추적 중인 키워드 목록 조회
   */
  getTrackedKeywords(storeId, status = 'active') {
    const stmt = this.db.prepare(`
      SELECT tk.*,
        (SELECT COUNT(*) FROM rank_history WHERE keyword_id = tk.id) as history_count,
        (SELECT rank FROM rank_history WHERE keyword_id = tk.id ORDER BY checked_at DESC LIMIT 1) as latest_rank,
        (SELECT checked_at FROM rank_history WHERE keyword_id = tk.id ORDER BY checked_at DESC LIMIT 1) as latest_check
      FROM tracked_keywords tk
      WHERE tk.store_id = ? AND tk.status = ?
      ORDER BY tk.added_at DESC
    `);

    return stmt.all(storeId, status);
  }

  /**
   * 모든 매장의 추적 키워드 조회 (Place ID 기준)
   */
  getTrackedKeywordsByPlaceId(placeId) {
    const stmt = this.db.prepare(`
      SELECT tk.*,
        s.name as store_name,
        (SELECT COUNT(*) FROM rank_history WHERE keyword_id = tk.id) as history_count,
        (SELECT rank FROM rank_history WHERE keyword_id = tk.id ORDER BY checked_at DESC LIMIT 1) as latest_rank,
        (SELECT checked_at FROM rank_history WHERE keyword_id = tk.id ORDER BY checked_at DESC LIMIT 1) as latest_check
      FROM tracked_keywords tk
      JOIN stores s ON tk.store_id = s.id
      WHERE tk.place_id = ? AND tk.status = 'active'
      ORDER BY tk.added_at DESC
    `);

    return stmt.all(placeId);
  }

  /**
   * 키워드 상태 변경 (active, paused, archived)
   */
  updateKeywordStatus(keywordId, status) {
    const stmt = this.db.prepare(`
      UPDATE tracked_keywords
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    return stmt.run(status, keywordId);
  }

  /**
   * 키워드 삭제
   */
  deleteTrackedKeyword(keywordId) {
    const stmt = this.db.prepare('DELETE FROM tracked_keywords WHERE id = ?');
    return stmt.run(keywordId);
  }

  /**
   * 순위 이력 저장
   */
  addRankHistory(data) {
    const {
      keywordId,
      storeId,
      placeId,
      keyword,
      rank,
      page,
      positionInPage,
      placeName,
      category,
      rating,
      reviewCount,
      maxPages,
      maxRank,
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO rank_history (
        keyword_id, store_id, place_id, keyword,
        rank, page, position_in_page,
        place_name, category, rating, review_count,
        max_pages, max_rank
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      keywordId,
      storeId,
      placeId,
      keyword,
      rank,
      page,
      positionInPage,
      placeName,
      category,
      rating,
      reviewCount,
      maxPages,
      maxRank
    );

    return result.lastInsertRowid;
  }

  /**
   * 키워드 순위 이력 조회
   */
  getRankHistory(keywordId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM rank_history
      WHERE keyword_id = ?
      ORDER BY checked_at DESC
      LIMIT ?
    `);

    return stmt.all(keywordId, limit);
  }

  /**
   * 날짜 범위로 순위 이력 조회
   */
  getRankHistoryByDateRange(keywordId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM rank_history
      WHERE keyword_id = ?
        AND checked_at >= ?
        AND checked_at <= ?
      ORDER BY checked_at ASC
    `);

    return stmt.all(keywordId, startDate, endDate);
  }

  /**
   * 여러 키워드의 최신 순위 조회
   */
  getLatestRanks(placeId) {
    const stmt = this.db.prepare(`
      SELECT
        tk.id as keyword_id,
        tk.keyword,
        tk.status,
        rh.rank,
        rh.rating,
        rh.review_count,
        rh.checked_at,
        (
          SELECT rank
          FROM rank_history
          WHERE keyword_id = tk.id
          ORDER BY checked_at DESC
          LIMIT 1 OFFSET 1
        ) as previous_rank
      FROM tracked_keywords tk
      LEFT JOIN (
        SELECT keyword_id, rank, rating, review_count, checked_at,
               ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY checked_at DESC) as rn
        FROM rank_history
      ) rh ON tk.id = rh.keyword_id AND rh.rn = 1
      WHERE tk.place_id = ? AND tk.status = 'active'
      ORDER BY tk.added_at DESC
    `);

    return stmt.all(placeId);
  }

  /**
   * 순위 통계 조회
   */
  getRankStats(keywordId) {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_checks,
        AVG(rank) as avg_rank,
        MIN(rank) as best_rank,
        MAX(rank) as worst_rank,
        MIN(checked_at) as first_check,
        MAX(checked_at) as last_check
      FROM rank_history
      WHERE keyword_id = ? AND rank IS NOT NULL
    `);

    return stmt.get(keywordId);
  }

  /**
   * DB 닫기
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('[DB] Database closed');
    }
  }
}
