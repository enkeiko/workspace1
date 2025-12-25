import axios from 'axios';
import * as cheerio from 'cheerio';
import { CollectedItem, NewsSource, CollectionResult } from './types';

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  }
});

// 네이버 검색 API를 통한 뉴스 수집 (시뮬레이션)
export async function collectFromNaverSearch(
  keywords: string[],
  category: 'ai-vibe' | 'local-biz'
): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: '네이버 검색',
    items: [],
    collectedAt: new Date()
  };

  // 실제 구현시에는 네이버 검색 API 사용
  // 현재는 RSS 기반으로 대체
  console.log(`🔍 네이버 검색 수집 (${keywords.join(', ')})`);

  return result;
}

// 블로그 플랫폼 스크래핑 (예: Velog)
export async function collectFromVelog(): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: 'Velog',
    items: [],
    collectedAt: new Date()
  };

  try {
    console.log('📡 Velog 트렌딩 수집 중...');
    
    // Velog 트렌딩 페이지 수집
    const response = await axiosInstance.get('https://velog.io/trending');
    const $ = cheerio.load(response.data);

    // Velog의 경우 CSR이므로 실제로는 API 호출 필요
    // 아래는 SSR 가정 시의 예시 코드
    $('article').each((_, element) => {
      const $el = $(element);
      const title = $el.find('h2').text().trim();
      const link = $el.find('a').attr('href');
      const summary = $el.find('p').first().text().trim();
      
      if (title && link) {
        result.items.push({
          title,
          summary,
          url: link.startsWith('http') ? link : `https://velog.io${link}`,
          source: 'Velog',
          publishedAt: new Date()
        });
      }
    });

    console.log(`✅ Velog: ${result.items.length}개 기사 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.log(`⚠️ Velog 수집 스킵 (CSR 제한)`);
  }

  return result;
}

// 브런치 스토리 수집
export async function collectFromBrunch(): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: 'Brunch',
    items: [],
    collectedAt: new Date()
  };

  try {
    console.log('📡 Brunch 수집 중...');
    
    const response = await axiosInstance.get('https://brunch.co.kr/keyword/IT_트렌드');
    const $ = cheerio.load(response.data);

    $('.wrap_article_keyword').each((_, element) => {
      const $el = $(element);
      const title = $el.find('.tit_subject').text().trim();
      const link = $el.find('a').attr('href');
      const summary = $el.find('.txt_sub').text().trim();
      
      if (title && link) {
        result.items.push({
          title,
          summary,
          url: link.startsWith('http') ? link : `https://brunch.co.kr${link}`,
          source: 'Brunch',
          publishedAt: new Date()
        });
      }
    });

    console.log(`✅ Brunch: ${result.items.length}개 기사 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.log(`⚠️ Brunch 수집 실패: ${error.message}`);
  }

  return result;
}

// 범용 웹 스크래퍼
export async function scrapeWebPage(source: NewsSource): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: source.name,
    items: [],
    collectedAt: new Date()
  };

  try {
    console.log(`📡 웹 스크래핑 중: ${source.name}`);
    const response = await axiosInstance.get(source.url);
    const $ = cheerio.load(response.data);

    // 일반적인 뉴스 기사 구조 추출
    $('article, .article, .news-item, .post-item').each((_, element) => {
      const $el = $(element);
      
      const title = $el.find('h1, h2, h3, .title, .headline').first().text().trim();
      const link = $el.find('a').first().attr('href');
      const summary = $el.find('p, .summary, .description, .excerpt').first().text().trim();
      const thumbnail = $el.find('img').first().attr('src');
      
      if (title && link) {
        let fullUrl = link;
        if (!link.startsWith('http')) {
          const baseUrl = new URL(source.url);
          fullUrl = `${baseUrl.origin}${link.startsWith('/') ? '' : '/'}${link}`;
        }
        
        result.items.push({
          title,
          summary: summary.slice(0, 300),
          url: fullUrl,
          source: source.name,
          sourceUrl: source.url,
          thumbnailUrl: thumbnail,
          publishedAt: new Date()
        });
      }
    });

    console.log(`✅ ${source.name}: ${result.items.length}개 기사 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ ${source.name} 스크래핑 실패:`, error.message);
  }

  return result;
}

// 기사 본문 추출
export async function extractArticleContent(url: string): Promise<{
  content: string;
  thumbnail?: string;
}> {
  try {
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);

    // 일반적인 본문 선택자들
    const contentSelectors = [
      'article', '.article-body', '.article-content',
      '.post-content', '.entry-content', '.content-body',
      '#article-body', '#content', '.news-content'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const text = $(selector).text().trim();
      if (text.length > content.length) {
        content = text;
      }
    }

    // 첫 번째 이미지 추출
    const thumbnail = $('article img, .article img, .content img').first().attr('src');

    return {
      content: content.replace(/\s+/g, ' ').slice(0, 2000),
      thumbnail
    };
  } catch (error) {
    return { content: '' };
  }
}

