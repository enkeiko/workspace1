import axios from 'axios';
import { CollectedItem, CollectionResult } from './types';

// 네이버 검색 API 설정
// 발급: https://developers.naver.com/apps/#/register
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

const naverApi = axios.create({
  baseURL: 'https://openapi.naver.com/v1/search',
  timeout: 10000,
  headers: {
    'X-Naver-Client-Id': NAVER_CLIENT_ID,
    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
  }
});

// 네이버 뉴스 검색
export async function searchNaverNews(
  query: string,
  display: number = 20,
  sort: 'sim' | 'date' = 'date'
): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: '네이버 뉴스',
    items: [],
    collectedAt: new Date()
  };

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('⚠️ 네이버 API 키가 설정되지 않았습니다.');
    result.error = '네이버 API 키 미설정';
    return result;
  }

  try {
    console.log(`📡 네이버 뉴스 검색: "${query}"`);
    
    const response = await naverApi.get('/news.json', {
      params: {
        query,
        display,
        sort
      }
    });

    const items = response.data.items || [];
    
    for (const item of items) {
      const collectedItem: CollectedItem = {
        title: cleanHtmlTags(item.title),
        summary: cleanHtmlTags(item.description),
        url: item.link,
        source: '네이버 뉴스',
        sourceUrl: item.originallink,
        publishedAt: new Date(item.pubDate)
      };
      
      result.items.push(collectedItem);
    }

    console.log(`✅ 네이버 뉴스 "${query}": ${result.items.length}개 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ 네이버 뉴스 검색 실패:`, error.message);
  }

  return result;
}

// 네이버 블로그 검색
export async function searchNaverBlog(
  query: string,
  display: number = 20,
  sort: 'sim' | 'date' = 'date'
): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: '네이버 블로그',
    items: [],
    collectedAt: new Date()
  };

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    result.error = '네이버 API 키 미설정';
    return result;
  }

  try {
    console.log(`📡 네이버 블로그 검색: "${query}"`);
    
    const response = await naverApi.get('/blog.json', {
      params: {
        query,
        display,
        sort
      }
    });

    const items = response.data.items || [];
    
    for (const item of items) {
      const collectedItem: CollectedItem = {
        title: cleanHtmlTags(item.title),
        summary: cleanHtmlTags(item.description),
        url: item.link,
        source: '네이버 블로그',
        sourceUrl: item.bloggerlink,
        author: item.bloggername,
        publishedAt: new Date(item.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'))
      };
      
      result.items.push(collectedItem);
    }

    console.log(`✅ 네이버 블로그 "${query}": ${result.items.length}개 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ 네이버 블로그 검색 실패:`, error.message);
  }

  return result;
}

// AI·바이브코딩 카테고리 검색어
export const AI_VIBE_QUERIES = [
  'AI 자동화',
  'ChatGPT 활용',
  '바이브코딩',
  '노코드 SaaS',
  'AI 부업',
  '자동화 수익',
  '1인 개발',
  'AI 마케팅',
  '프롬프트 엔지니어링',
  '생성형 AI 비즈니스'
];

// 자영업·네이버 플레이스 카테고리 검색어
export const LOCAL_BIZ_QUERIES = [
  '네이버 플레이스 상위노출',
  '자영업 마케팅',
  '리뷰 마케팅',
  '로컬 SEO',
  '소상공인 매출',
  '오프라인 매장 마케팅',
  '음식점 홍보',
  '카페 마케팅',
  '네이버 지도 최적화',
  '배달앱 마케팅'
];

// 카테고리별 뉴스 수집
export async function collectNaverNewsByCategory(
  category: 'ai-vibe' | 'local-biz'
): Promise<CollectionResult> {
  const queries = category === 'ai-vibe' ? AI_VIBE_QUERIES : LOCAL_BIZ_QUERIES;
  const allItems: CollectedItem[] = [];
  const errors: string[] = [];

  for (const query of queries.slice(0, 5)) { // 상위 5개 검색어만
    const result = await searchNaverNews(query, 10);
    
    if (result.items.length > 0) {
      result.items.forEach(item => {
        item.category = category;
      });
      allItems.push(...result.items);
    }
    
    if (result.error) {
      errors.push(result.error);
    }

    // API 호출 간격 (초당 10회 제한)
    await delay(150);
  }

  // 중복 제거 (URL 기준)
  const uniqueItems = Array.from(
    new Map(allItems.map(item => [item.url, item])).values()
  );

  return {
    source: `네이버 뉴스 (${category})`,
    items: uniqueItems,
    collectedAt: new Date(),
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// 카테고리별 블로그 수집
export async function collectNaverBlogByCategory(
  category: 'ai-vibe' | 'local-biz'
): Promise<CollectionResult> {
  const queries = category === 'ai-vibe' ? AI_VIBE_QUERIES : LOCAL_BIZ_QUERIES;
  const allItems: CollectedItem[] = [];
  const errors: string[] = [];

  for (const query of queries.slice(0, 3)) { // 상위 3개 검색어만
    const result = await searchNaverBlog(query, 10);
    
    if (result.items.length > 0) {
      result.items.forEach(item => {
        item.category = category;
      });
      allItems.push(...result.items);
    }
    
    if (result.error) {
      errors.push(result.error);
    }

    await delay(150);
  }

  const uniqueItems = Array.from(
    new Map(allItems.map(item => [item.url, item])).values()
  );

  return {
    source: `네이버 블로그 (${category})`,
    items: uniqueItems,
    collectedAt: new Date(),
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// HTML 태그 제거
function cleanHtmlTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API 키 확인
export function isNaverApiConfigured(): boolean {
  return !!(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);
}

