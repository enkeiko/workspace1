import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databasePath: process.env.DATABASE_PATH || './data/news.db',
  
  // Admin
  adminSecret: process.env.ADMIN_SECRET || 'default-secret-change-this',
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Spam Filter
  spamWords: (process.env.SPAM_WORDS || '스팸,광고,홍보').split(','),
  
  // AI Filter (기사 선정에 AI 사용 여부)
  useAIFilter: process.env.USE_AI_FILTER === 'true',
  aiFilterConfidenceThreshold: parseFloat(process.env.AI_FILTER_CONFIDENCE_THRESHOLD || '70'), // 0-100
  
  // Categories
  categories: {
    AI_VIBE: {
      id: 'ai-vibe',
      name: 'AI·바이브코딩',
      emoji: '🔵',
      keywords: [
        'AI', '인공지능', '자동화', '바이브코딩', 'vibe coding',
        'ChatGPT', 'GPT', '클로드', 'Claude', 'LLM',
        '1인 SaaS', 'SaaS', '노코드', 'no-code', '로우코드',
        '디지털 노마드', '수익화', '부업', '사이드프로젝트',
        '자동 수익', 'AI 마케팅', 'AI 툴', '생성형 AI',
        '프롬프트', 'prompt', '자동화 도구', 'n8n', 'zapier',
        'make', 'automation', '워크플로우'
      ],
      description: '바이브코딩 / AI 자동화 / 디지털 돈버는 흐름 뉴스'
    },
    LOCAL_BIZ: {
      id: 'local-biz',
      name: '자영업·네이버 플레이스',
      emoji: '🟢',
      keywords: [
        '자영업', '소상공인', '매장', '오프라인',
        '네이버 플레이스', '플레이스', 'SEO', '로컬 SEO',
        '리뷰 마케팅', '리뷰', '별점', '후기',
        '지역 키워드', '상권', '배달', '예약',
        '카페', '음식점', '매출', '고객',
        '인스타그램 마케팅', '블로그 마케팅', '입소문',
        '단골', '재방문', '객단가', '테이블 회전율'
      ],
      description: '자영업자 마케팅 / 네이버 플레이스 / 지역 비즈니스 성장 뉴스'
    }
  },
  
  // News Sources
  sources: [
    // Tech News
    { name: 'ZDNet Korea', url: 'https://zdnet.co.kr/rss/news.xml', type: 'rss' },
    { name: '블로터', url: 'https://www.bloter.net/feed', type: 'rss' },
    { name: 'ITWorld Korea', url: 'https://www.itworld.co.kr/rss/feed.xml', type: 'rss' },
    { name: '디지털데일리', url: 'https://www.ddaily.co.kr/rss/rss.xml', type: 'rss' },
    { name: '테크니들', url: 'https://techneedle.com/feed', type: 'rss' },
    { name: '벤처스퀘어', url: 'https://www.venturesquare.net/feed', type: 'rss' },
    { name: 'Byline Network', url: 'https://byline.network/feed/', type: 'rss' },
    // Blog platforms (sample - actual implementation would need web scraping)
    { name: 'Velog', url: 'https://velog.io', type: 'scrape', category: 'tech' },
    { name: 'Brunch', url: 'https://brunch.co.kr', type: 'scrape', category: 'both' },
  ],
  
  // Output paths
  outputDir: path.join(process.cwd(), 'output'),
  
  // Update times (KST)
  updateTimes: ['07:00', '12:00', '18:00', '23:00']
};

export type Category = 'ai-vibe' | 'local-biz';

