// 수집된 뉴스 아이템의 기본 타입
export interface CollectedItem {
  title: string;
  summary?: string;
  content?: string;
  url: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  publishedAt?: Date;
  thumbnailUrl?: string;
  category?: 'ai-vibe' | 'local-biz';
  tags?: string[];
}

// 뉴스 소스 설정
export interface NewsSource {
  name: string;
  url: string;
  type: 'rss' | 'scrape' | 'api';
  category?: 'ai-vibe' | 'local-biz' | 'both';
  enabled?: boolean;
}

// 수집 결과
export interface CollectionResult {
  source: string;
  items: CollectedItem[];
  collectedAt: Date;
  error?: string;
}

