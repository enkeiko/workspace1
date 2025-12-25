import Parser from 'rss-parser';
import { CollectedItem, NewsSource, CollectionResult } from './types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  }
});

export async function collectFromRSS(source: NewsSource): Promise<CollectionResult> {
  const result: CollectionResult = {
    source: source.name,
    items: [],
    collectedAt: new Date()
  };

  try {
    console.log(`📡 RSS 수집 중: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(`⚠️ ${source.name}: 피드가 비어있습니다`);
      return result;
    }

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      const collectedItem: CollectedItem = {
        title: cleanText(item.title),
        summary: cleanText(item.contentSnippet || item.content || ''),
        content: item.content || item['content:encoded'] || '',
        url: item.link,
        source: source.name,
        sourceUrl: feed.link || source.url,
        author: item.creator || item.author || undefined,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        thumbnailUrl: extractThumbnail(item)
      };

      result.items.push(collectedItem);
    }

    console.log(`✅ ${source.name}: ${result.items.length}개 기사 수집`);
  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ ${source.name} 수집 실패:`, error.message);
  }

  return result;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractThumbnail(item: any): string | undefined {
  // 다양한 RSS 포맷에서 썸네일 추출
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }
  if (item['media:content']?.url) {
    return item['media:content'].url;
  }
  if (item['media:thumbnail']?.url) {
    return item['media:thumbnail'].url;
  }
  
  // content에서 첫 번째 이미지 추출
  const content = item.content || item['content:encoded'] || '';
  const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  return undefined;
}

// RSS 소스 목록
export const RSS_SOURCES: NewsSource[] = [
  // 주요 IT 미디어
  { 
    name: 'ZDNet Korea', 
    url: 'https://zdnet.co.kr/rss/news.xml', 
    type: 'rss',
    category: 'both'
  },
  { 
    name: '블로터', 
    url: 'https://www.bloter.net/feed', 
    type: 'rss',
    category: 'ai-vibe'
  },
  { 
    name: 'ITWorld Korea', 
    url: 'https://www.itworld.co.kr/rss/feed.xml', 
    type: 'rss',
    category: 'ai-vibe'
  },
  { 
    name: '테크니들', 
    url: 'https://techneedle.com/feed', 
    type: 'rss',
    category: 'ai-vibe'
  },
  { 
    name: '벤처스퀘어', 
    url: 'https://www.venturesquare.net/feed', 
    type: 'rss',
    category: 'ai-vibe'
  },
  { 
    name: 'Byline Network', 
    url: 'https://byline.network/feed/', 
    type: 'rss',
    category: 'ai-vibe'
  },
  { 
    name: '디지털타임스', 
    url: 'http://www.dt.co.kr/rss/news.xml', 
    type: 'rss',
    category: 'both'
  },
  { 
    name: '전자신문', 
    url: 'https://www.etnews.com/rss', 
    type: 'rss',
    category: 'both'
  },
  // 경제/비즈니스
  { 
    name: '한국경제 IT', 
    url: 'https://www.hankyung.com/feed/it', 
    type: 'rss',
    category: 'both'
  },
  { 
    name: '매일경제 IT', 
    url: 'https://www.mk.co.kr/rss/30000001/', 
    type: 'rss',
    category: 'both'
  }
];

