# 네이버 플레이스 ERP - 보안 및 성능 보완 문서

본 문서는 기존 기획서에 추가되어야 할 보안, 크롤링 안정성, 성능 최적화 내용을 포함합니다.

---

## 크롤링 안정성 및 성능 최적화

### 1. 크롤링 안정성 전략

#### 1.1 봇 감지 우회
```typescript
// lib/crawler/browser-config.ts
import { chromium, BrowserContext } from 'playwright'

export async function createStealthBrowser() {
  const browser = await chromium.launch({
    headless: false, // 또는 'new' 모드 (더 감지하기 어려움)
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  })
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: getRandomUserAgent(),
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['geolocation']
  })
  
  // navigator.webdriver 제거
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    })
  })
  
  return { browser, context }
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
  ]
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}
```

#### 1.2 랜덤 지연 및 인간 행동 모방
```typescript
// lib/crawler/human-behavior.ts

export function randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

export async function humanLikeMouseMove(page: Page) {
  // 페이지 내 랜덤 위치로 마우스 이동
  const x = Math.floor(Math.random() * 1000) + 100
  const y = Math.floor(Math.random() * 600) + 100
  
  await page.mouse.move(x, y, { steps: 10 })
  await randomDelay(100, 500)
}

export async function randomScroll(page: Page) {
  const scrollAmount = Math.floor(Math.random() * 300) + 100
  await page.evaluate((amount) => {
    window.scrollBy({ top: amount, behavior: 'smooth' })
  }, scrollAmount)
  await randomDelay(500, 1500)
}
```

#### 1.3 재시도 로직 (Exponential Backoff)
```typescript
// lib/crawler/retry.ts

interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000
  }
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === options.maxAttempts) {
        throw lastError
      }
      
      // Exponential backoff: baseDelay * 2^(attempt-1)
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt - 1),
        options.maxDelay
      )
      
      console.log(`Retry attempt ${attempt}/${options.maxAttempts} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// 사용 예
const rankData = await retryWithBackoff(
  () => crawlKeywordRank(storeId, keyword),
  { maxAttempts: 3, baseDelay: 2000, maxDelay: 10000 }
)
```

#### 1.4 크롤링 큐 우선순위 시스템
```typescript
// lib/queue/crawl-queue.ts
import { Queue, Worker, Job } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!)

export enum CrawlPriority {
  URGENT = 1,    // 즉시 처리 필요 (수동 요청)
  HIGH = 5,      // 중요 고객의 매장
  NORMAL = 10,   // 일반 정기 크롤링
  LOW = 20       // 비활성 매장
}

interface CrawlJobData {
  storeId: number
  keyword: string
  source: 'manual' | 'scheduled' | 'api'
}

export const crawlQueue = new Queue<CrawlJobData>('crawl', { 
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100, // 완료된 작업 100개까지 보관
    removeOnFail: 500
  }
})

// 크롤링 작업 추가
export async function addCrawlJob(
  data: CrawlJobData,
  priority: CrawlPriority = CrawlPriority.NORMAL
) {
  return crawlQueue.add('crawl-keyword', data, {
    priority,
    jobId: `${data.storeId}-${data.keyword}-${Date.now()}` // 중복 방지
  })
}

// Rate limiting을 고려한 워커
export const crawlWorker = new Worker<CrawlJobData>(
  'crawl',
  async (job: Job<CrawlJobData>) => {
    // Rate limit 체크
    const canProceed = await checkCrawlRateLimit()
    if (!canProceed) {
      throw new Error('Rate limit exceeded, will retry')
    }
    
    // 크롤링 실행
    const result = await crawlKeywordRank(job.data.storeId, job.data.keyword)
    
    // 결과 저장
    await prisma.keywordRanking.create({
      data: {
        storeId: job.data.storeId,
        keyword: job.data.keyword,
        rankPosition: result.rank,
        dataSource: job.data.source,
        crawlMetadata: {
          duration: result.duration,
          retries: job.attemptsMade
        }
      }
    })
    
    return result
  },
  { 
    connection,
    concurrency: 3, // 동시에 3개만 처리
    limiter: {
      max: 10, // 10개 작업을
      duration: 60000 // 1분당
    }
  }
)

// Rate limit 체크
async function checkCrawlRateLimit(): Promise<boolean> {
  const key = 'crawl:ratelimit:global'
  const current = await connection.incr(key)
  
  if (current === 1) {
    await connection.expire(key, 60) // 1분
  }
  
  return current <= 10 // 분당 10개 제한
}
```

### 2. 다중 크롤링 소스 관리

```typescript
// lib/crawler/multi-source.ts

export type CrawlSource = 'naver_direct' | 'adlog' | 'api_partner' | 'manual'

interface CrawlSourceConfig {
  priority: number // 우선순위 (낮을수록 우선)
  reliability: number // 신뢰도 (0-1)
  enabled: boolean
}

const sourceConfigs: Record<CrawlSource, CrawlSourceConfig> = {
  api_partner: { priority: 1, reliability: 0.98, enabled: true },
  adlog: { priority: 2, reliability: 0.95, enabled: true },
  naver_direct: { priority: 3, reliability: 0.90, enabled: true },
  manual: { priority: 4, reliability: 1.0, enabled: true }
}

export async function crawlWithFallback(
  storeId: number,
  keyword: string
): Promise<{ rank: number; source: CrawlSource }> {
  
  // 우선순위 순으로 정렬
  const sources = Object.entries(sourceConfigs)
    .filter(([_, config]) => config.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([source]) => source as CrawlSource)
  
  let lastError: Error | null = null
  
  for (const source of sources) {
    try {
      console.log(`Trying source: ${source}`)
      const rank = await crawlFromSource(source, storeId, keyword)
      
      return { rank, source }
    } catch (error) {
      console.error(`Source ${source} failed:`, error)
      lastError = error as Error
      
      // 다음 소스로 계속
      continue
    }
  }
  
  // 모든 소스 실패
  throw new Error(`All crawl sources failed. Last error: ${lastError?.message}`)
}

async function crawlFromSource(
  source: CrawlSource,
  storeId: number,
  keyword: string
): Promise<number> {
  switch (source) {
    case 'api_partner':
      return crawlViaAPI(storeId, keyword)
    case 'adlog':
      return crawlAdlog(storeId, keyword)
    case 'naver_direct':
      return crawlNaverDirect(storeId, keyword)
    case 'manual':
      throw new Error('Manual source requires user input')
  }
}
```

### 3. 크롤링 실패 모니터링

```typescript
// lib/crawler/monitoring.ts

interface CrawlFailure {
  storeId: number
  keyword: string
  source: CrawlSource
  error: string
  attemptCount: number
}

export async function handleCrawlFailure(failure: CrawlFailure) {
  // 1. 데이터베이스에 기록
  await prisma.crawlFailureLog.create({
    data: {
      storeId: failure.storeId,
      keyword: failure.keyword,
      source: failure.source,
      errorMessage: failure.error,
      attemptCount: failure.attemptCount,
      failedAt: new Date()
    }
  })
  
  // 2. 연속 실패 체크
  const recentFailures = await prisma.crawlFailureLog.count({
    where: {
      storeId: failure.storeId,
      failedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24시간
      }
    }
  })
  
  // 3. 임계값 초과 시 알림
  if (recentFailures >= 5) {
    await sendAdminNotification({
      type: 'crawl_failure_critical',
      message: `매장 ${failure.storeId}의 크롤링이 24시간 내 ${recentFailures}회 실패했습니다.`,
      severity: 'high'
    })
  }
}

// 크롤링 성능 모니터링
export async function trackCrawlMetrics(metrics: {
  source: CrawlSource
  duration: number
  success: boolean
  storeId: number
}) {
  // 메트릭 저장
  await prisma.crawlMetrics.create({
    data: metrics
  })
  
  // 평균 응답 시간 계산 (최근 100건)
  const recentMetrics = await prisma.crawlMetrics.findMany({
    where: { source: metrics.source, success: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
  
  const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
  
  // 성능 저하 감지
  if (metrics.duration > avgDuration * 3) {
    console.warn(`Slow crawl detected: ${metrics.duration}ms (avg: ${avgDuration}ms)`)
  }
}
```

### 4. 데이터베이스 성능 최적화

#### 4.1 Materialized View for Dashboard
```sql
-- 대시보드 통계 미리 계산
CREATE MATERIALIZED VIEW dashboard_stats_monthly AS
SELECT 
    DATE_TRUNC('month', order_date) as month,
    SUM(total_amount) as revenue,
    COUNT(DISTINCT customer_id) as active_customers,
    COUNT(*) as order_count,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE order_status IN ('completed', 'in_progress')
GROUP BY DATE_TRUNC('month', order_date);

-- 인덱스 추가
CREATE UNIQUE INDEX idx_dashboard_stats_month ON dashboard_stats_monthly(month);

-- 매일 새벽 갱신 (Cron으로 실행)
REFRESH MATERIALIZED VIEW dashboard_stats_monthly;
```

#### 4.2 순위 데이터 파티셔닝
```sql
-- 날짜별 파티션 (PostgreSQL 10+)
CREATE TABLE keyword_rankings (
    id SERIAL,
    store_id INT,
    keyword VARCHAR(200),
    rank_position INT,
    rank_date DATE NOT NULL,
    ...
) PARTITION BY RANGE (rank_date);

-- 월별 파티션 생성
CREATE TABLE keyword_rankings_2024_01 PARTITION OF keyword_rankings
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE keyword_rankings_2024_02 PARTITION OF keyword_rankings
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... 기타 월
```

#### 4.3 쿼리 최적화 예시
```typescript
// ❌ N+1 문제
const stores = await prisma.store.findMany()
for (const store of stores) {
  const keywords = await prisma.storeKeyword.findMany({
    where: { storeId: store.id }
  })
}

// ✅ 개선: include 사용
const stores = await prisma.store.findMany({
  include: {
    keywords: true
  }
})

// ✅ 더 나은 방법: 페이지네이션 + 선택적 로딩
const stores = await prisma.store.findMany({
  take: 20,
  skip: page * 20,
  where: { status: 'active' },
  include: {
    keywords: {
      where: { isActive: true },
      take: 10
    },
    _count: {
      select: { keywords: true }
    }
  }
})
```

---

## 비용 재산정

### 실제 운영 비용 (월간)

**인프라**:
- 웹 서버 (Vercel Pro): 월 $20 (~2.7만원)
- PostgreSQL (Supabase/Neon Pro): 월 $25 (~3.3만원)
- Redis (Upstash): 월 $10 (~1.3만원)
- 파일 스토리지 (Cloudflare R2): 월 $5 (~0.7만원)
**소계**: ~8만원

**크롤링**:
- Proxy 서비스 (선택): 월 10만~20만원
- 크롤링 전용 서버 (선택): 월 5만~15만원
**소계**: 0~35만원 (직접 크롤링 시)

**API 비용**:
- 세금계산서 (홈택스/바로빌): 월 3~5만원
- 카카오톡 알림톡: 고객 30개 × 월 4회 × 15원 = 1,800원
- SMS (보조): 월 1만원
- 은행 API: 무료
**소계**: ~5만원

**모니터링/로깅** (선택):
- Sentry (에러 추적): 무료~5만원
- Vercel Analytics: 무료
**소계**: 0~5만원

**총 운영비**: 
- 최소: 월 13만원 (Proxy 없이)
- 권장: 월 30~50만원 (안정적 운영)
- 최대: 월 50~70만원 (Full 옵션)

### ROI 재계산

**비용 절감**:
- 수동 작업 시간 절감: 월 40시간 × 5만원/시간 = 200만원
- 실수 감소, 신뢰도 향상: 정성적 가치

**순이익**:
- 200만원 (절감) - 50만원 (운영비) = 150만원/월
- 연간: 1,800만원

**개발 투자 회수**:
- 6개월 자체 개발 (인건비 제외)
- 운영비 기준: 즉시 흑자
- 시간 투자 기준: 3~6개월

---

## 추가 필요 테이블

### crawl_failure_logs
```sql
CREATE TABLE crawl_failure_logs (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id),
    keyword VARCHAR(200),
    source VARCHAR(50),
    error_message TEXT,
    attempt_count INT,
    failed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crawl_failures_store ON crawl_failure_logs(store_id);
CREATE INDEX idx_crawl_failures_time ON crawl_failure_logs(failed_at);
```

### crawl_metrics
```sql
CREATE TABLE crawl_metrics (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50),
    store_id INT,
    duration INT, -- 밀리초
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crawl_metrics_source ON crawl_metrics(source, created_at);
```

---

## 개발 우선순위 수정안

### Phase 0: 기반 (1주)
1. **인증 시스템** (JWT, 비밀번호 해싱)
2. **권한 관리** (RBAC)
3. **암호화 유틸리티**
4. **감사 로그**

### Phase 1: MVP (6~8주)
1. 고객 관리 CRUD
2. 매장 관리 CRUD + 크롤링 (기본)
3. 키워드 관리
4. 순위 입력 (수동 + 엑셀)
5. 주문/견적 관리
6. 기본 대시보드

### Phase 2: 확장 (8~10주)
1. 작업 히스토리
2. 진단 보고서
3. 구매/거래처 관리
4. 세금계산서 연동
5. 입금 관리
6. 손익 분석

### Phase 3: 자동화 (8~10주)
1. **크롤링 큐 + 스케줄러** ⭐
2. **다중 소스 + Fallback** ⭐
3. 은행 API 연동
4. Google Drive 자동화
5. 구매 발주 자동화
6. 모니터링 대시보드

**Phase 0이 가장 중요합니다!** 나중에 추가하면 전체 리팩토링 필요.

---

**보완 문서 끝**
