import { CollectedItem, CollectionResult } from './types';
import { collectFromRSS, RSS_SOURCES } from './rss-collector';
import { collectFromVelog, collectFromBrunch } from './web-scraper';
import { 
  collectNaverNewsByCategory, 
  collectNaverBlogByCategory,
  isNaverApiConfigured 
} from './naver-api';
import { ArticleRepository } from '../database';
import { filterAndCategorize } from '../processors/filter';
import { scoreArticle } from '../processors/scorer';
import { generateSummary, generateActionIdea } from '../processors/summarizer';
import { generateAISummary, isOpenAIConfigured } from '../processors/ai-summarizer';

export interface CollectionStats {
  total: number;
  aiVibe: number;
  localBiz: number;
  duplicates: number;
  errors: string[];
}

// 모든 소스에서 뉴스 수집
export async function collectAllNews(): Promise<CollectionStats> {
  console.log('🚀 뉴스 수집 시작...');
  const startTime = Date.now();
  
  const stats: CollectionStats = {
    total: 0,
    aiVibe: 0,
    localBiz: 0,
    duplicates: 0,
    errors: []
  };

  const allItems: CollectedItem[] = [];

  // 1. 네이버 API 수집 (우선순위 높음)
  if (isNaverApiConfigured()) {
    console.log('📡 네이버 API 수집 시작...');
    
    try {
      // AI·바이브코딩 뉴스
      const aiVibeNews = await collectNaverNewsByCategory('ai-vibe');
      allItems.push(...aiVibeNews.items);
      if (aiVibeNews.error) stats.errors.push(aiVibeNews.error);
      
      // 자영업·네이버 플레이스 뉴스
      const localBizNews = await collectNaverNewsByCategory('local-biz');
      allItems.push(...localBizNews.items);
      if (localBizNews.error) stats.errors.push(localBizNews.error);
      
      // 블로그 수집 (선택적)
      const aiVibeBlog = await collectNaverBlogByCategory('ai-vibe');
      allItems.push(...aiVibeBlog.items);
      
      const localBizBlog = await collectNaverBlogByCategory('local-biz');
      allItems.push(...localBizBlog.items);
      
    } catch (error: any) {
      stats.errors.push(`네이버 API 오류: ${error.message}`);
    }
  } else {
    console.log('⚠️ 네이버 API 미설정 - RSS 피드만 사용');
  }

  // 2. RSS 피드 수집 (병렬)
  console.log('📡 RSS 피드 수집 시작...');
  const rssPromises = RSS_SOURCES.map(source => collectFromRSS(source));
  const rssResults = await Promise.allSettled(rssPromises);
  
  for (const result of rssResults) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      if (result.value.error) {
        stats.errors.push(result.value.error);
      }
    } else {
      stats.errors.push(result.reason?.message || 'Unknown RSS error');
    }
  }

  // 3. 블로그 플랫폼 수집 (선택적)
  try {
    const velogResult = await collectFromVelog();
    allItems.push(...velogResult.items);
  } catch (e) {
    // 스킵
  }

  try {
    const brunchResult = await collectFromBrunch();
    allItems.push(...brunchResult.items);
  } catch (e) {
    // 스킵
  }

  console.log(`📊 총 ${allItems.length}개 항목 수집됨`);

  // 3. 필터링 및 카테고리 분류
  const { aiVibe, localBiz } = filterAndCategorize(allItems);
  
  console.log(`🔵 AI·바이브코딩: ${aiVibe.length}개`);
  console.log(`🟢 자영업·네이버 플레이스: ${localBiz.length}개`);

  // 4. 데이터베이스에 저장
  const processedItems = [...aiVibe, ...localBiz];
  
  for (const item of processedItems) {
    try {
      // 중복 체크
      const existing = ArticleRepository.findByUrl(item.url);
      if (existing) {
        stats.duplicates++;
        continue;
      }

      // 스코어링
      const scores = scoreArticle(item);
      
      // 요약 및 액션 아이디어 생성 (AI 또는 규칙 기반)
      let summary: string;
      let actionIdea: string;
      
      if (isOpenAIConfigured() && item.content && item.content.length > 100) {
        // AI 요약 사용
        try {
          const aiResult = await generateAISummary(
            item.title,
            item.content,
            item.category as 'ai-vibe' | 'local-biz'
          );
          summary = aiResult.summary;
          actionIdea = aiResult.actionIdea;
        } catch {
          // AI 실패 시 규칙 기반 사용
          summary = item.summary || generateSummary(item.title, item.content || '');
          actionIdea = generateActionIdea(item);
        }
      } else {
        // 규칙 기반 요약
        summary = item.summary || generateSummary(item.title, item.content || '');
        actionIdea = generateActionIdea(item);
      }

      // 저장
      ArticleRepository.insert({
        external_id: generateExternalId(item.url),
        category: item.category!,
        title: item.title,
        summary: summary.slice(0, 500),
        content: item.content?.slice(0, 5000),
        source_name: item.source,
        source_url: item.sourceUrl,
        original_url: item.url,
        thumbnail_url: item.thumbnailUrl,
        author: item.author,
        published_at: item.publishedAt?.toISOString(),
        practicality_score: scores.practicality,
        profit_potential_score: scores.profitPotential,
        scalability_score: scores.scalability,
        total_score: scores.total,
        tags: JSON.stringify(item.tags || extractTags(item)),
        action_idea: actionIdea
      });

      stats.total++;
      if (item.category === 'ai-vibe') {
        stats.aiVibe++;
      } else {
        stats.localBiz++;
      }
    } catch (error: any) {
      if (!error.message?.includes('UNIQUE constraint')) {
        stats.errors.push(`저장 실패 (${item.title}): ${error.message}`);
      } else {
        stats.duplicates++;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ 수집 완료! (${elapsed}초)`);
  console.log(`   - 신규 저장: ${stats.total}개`);
  console.log(`   - 중복 제외: ${stats.duplicates}개`);
  console.log(`   - 오류: ${stats.errors.length}개`);

  return stats;
}

// 특정 시간 범위의 기사만 수집
export async function collectRecentNews(hoursAgo: number = 6): Promise<CollectionStats> {
  const stats = await collectAllNews();
  
  // 이미 collectAllNews에서 최신 기사만 수집하므로
  // 추가 필터링이 필요하면 여기서 처리
  
  return stats;
}

// 외부 ID 생성
function generateExternalId(url: string): string {
  const hash = Buffer.from(url).toString('base64').slice(0, 20);
  return `ext_${hash}`;
}

// 기사에서 태그 추출
function extractTags(item: CollectedItem): string[] {
  const tags: Set<string> = new Set();
  const text = `${item.title} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
  
  // AI/자동화 관련 태그
  const aiKeywords: Record<string, string> = {
    'ai': 'AI',
    '인공지능': 'AI',
    'chatgpt': 'ChatGPT',
    'gpt': 'GPT',
    '클로드': 'Claude',
    'claude': 'Claude',
    '자동화': '자동화',
    'automation': '자동화',
    '바이브코딩': '바이브코딩',
    'vibe': '바이브코딩',
    'saas': 'SaaS',
    '노코드': '노코드',
    'no-code': '노코드',
    '프롬프트': '프롬프트',
    'prompt': '프롬프트',
    '수익화': '수익화',
    '부업': '부업'
  };

  // 자영업/마케팅 관련 태그
  const bizKeywords: Record<string, string> = {
    '자영업': '자영업',
    '소상공인': '자영업',
    '네이버 플레이스': '네이버플레이스',
    '플레이스': '네이버플레이스',
    '리뷰': '리뷰마케팅',
    'seo': '로컬SEO',
    '검색 최적화': '로컬SEO',
    '매출': '매출',
    '마케팅': '마케팅',
    '오프라인': '오프라인',
    '매장': '매장'
  };

  const allKeywords = { ...aiKeywords, ...bizKeywords };
  
  for (const [keyword, tag] of Object.entries(allKeywords)) {
    if (text.includes(keyword)) {
      tags.add(tag);
    }
  }

  return Array.from(tags).slice(0, 5);
}

export { CollectedItem, CollectionResult } from './types';

