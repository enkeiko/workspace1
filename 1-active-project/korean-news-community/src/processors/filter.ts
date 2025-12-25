import { CollectedItem } from '../collectors/types';
import { config } from '../config';

interface FilteredResult {
  aiVibe: CollectedItem[];
  localBiz: CollectedItem[];
  excluded: CollectedItem[];
}

// AI·바이브코딩 카테고리 키워드 (가중치 포함)
const AI_VIBE_KEYWORDS: { keyword: string; weight: number }[] = [
  // 핵심 키워드 (높은 가중치)
  { keyword: 'ai', weight: 3 },
  { keyword: '인공지능', weight: 3 },
  { keyword: 'chatgpt', weight: 3 },
  { keyword: 'gpt-4', weight: 3 },
  { keyword: 'gpt4', weight: 3 },
  { keyword: '클로드', weight: 3 },
  { keyword: 'claude', weight: 3 },
  { keyword: '바이브코딩', weight: 5 },
  { keyword: 'vibe coding', weight: 5 },
  { keyword: '자동화', weight: 2 },
  { keyword: 'automation', weight: 2 },
  
  // SaaS / 수익화
  { keyword: 'saas', weight: 3 },
  { keyword: '1인 사업', weight: 3 },
  { keyword: '1인사업', weight: 3 },
  { keyword: '사이드프로젝트', weight: 2 },
  { keyword: '사이드 프로젝트', weight: 2 },
  { keyword: '수익화', weight: 2 },
  { keyword: '부업', weight: 2 },
  { keyword: '디지털 노마드', weight: 2 },
  
  // 노코드/로우코드
  { keyword: '노코드', weight: 2 },
  { keyword: 'no-code', weight: 2 },
  { keyword: '로우코드', weight: 2 },
  { keyword: 'low-code', weight: 2 },
  
  // AI 도구
  { keyword: 'llm', weight: 2 },
  { keyword: '대규모 언어', weight: 2 },
  { keyword: '생성형 ai', weight: 3 },
  { keyword: '생성형ai', weight: 3 },
  { keyword: '프롬프트', weight: 2 },
  { keyword: 'prompt', weight: 2 },
  { keyword: 'midjourney', weight: 2 },
  { keyword: '미드저니', weight: 2 },
  { keyword: 'stable diffusion', weight: 2 },
  { keyword: 'dall-e', weight: 2 },
  
  // 자동화 도구
  { keyword: 'n8n', weight: 2 },
  { keyword: 'zapier', weight: 2 },
  { keyword: 'make.com', weight: 2 },
  { keyword: '워크플로우 자동화', weight: 2 },
  { keyword: 'rpa', weight: 2 },
  
  // 관련 기술
  { keyword: 'api 연동', weight: 1 },
  { keyword: '크롤링', weight: 1 },
  { keyword: '스크래핑', weight: 1 },
  { keyword: '봇', weight: 1 },
  { keyword: '자동 수익', weight: 2 },
];

// 자영업·네이버 플레이스 카테고리 키워드
const LOCAL_BIZ_KEYWORDS: { keyword: string; weight: number }[] = [
  // 핵심 키워드
  { keyword: '네이버 플레이스', weight: 5 },
  { keyword: '네이버플레이스', weight: 5 },
  { keyword: 'naver place', weight: 5 },
  { keyword: '자영업', weight: 3 },
  { keyword: '소상공인', weight: 3 },
  { keyword: '오프라인 매장', weight: 3 },
  { keyword: '오프라인매장', weight: 3 },
  
  // SEO / 마케팅
  { keyword: '로컬 seo', weight: 3 },
  { keyword: '로컬seo', weight: 3 },
  { keyword: '지역 키워드', weight: 3 },
  { keyword: '검색 최적화', weight: 2 },
  { keyword: '리뷰 마케팅', weight: 3 },
  { keyword: '리뷰마케팅', weight: 3 },
  { keyword: '블로그 마케팅', weight: 2 },
  { keyword: '인스타그램 마케팅', weight: 2 },
  { keyword: '입소문', weight: 2 },
  
  // 매장 운영
  { keyword: '매출 증대', weight: 3 },
  { keyword: '매출증대', weight: 3 },
  { keyword: '객단가', weight: 2 },
  { keyword: '테이블 회전', weight: 2 },
  { keyword: '재방문', weight: 2 },
  { keyword: '단골', weight: 2 },
  { keyword: '고객 관리', weight: 2 },
  
  // 업종
  { keyword: '음식점', weight: 2 },
  { keyword: '카페', weight: 2 },
  { keyword: '식당', weight: 2 },
  { keyword: '미용실', weight: 2 },
  { keyword: '헬스장', weight: 2 },
  { keyword: '배달', weight: 2 },
  { keyword: '예약', weight: 1 },
  
  // 플랫폼
  { keyword: '배달의민족', weight: 2 },
  { keyword: '배민', weight: 2 },
  { keyword: '쿠팡이츠', weight: 2 },
  { keyword: '요기요', weight: 2 },
  { keyword: '카카오맵', weight: 2 },
  
  // 리뷰 관련
  { keyword: '별점', weight: 2 },
  { keyword: '후기', weight: 2 },
  { keyword: '리뷰 이벤트', weight: 2 },
  { keyword: '평점', weight: 2 },
];

// 제외 키워드 (스팸/무관)
const EXCLUDE_KEYWORDS = [
  '주식', '증권', '펀드', '부동산 투자', '코인',
  '암호화폐', '비트코인', '이더리움',
  '게임 출시', '신작 게임', 'e스포츠',
  '연예', '아이돌', '드라마', '영화 개봉',
  '정치', '선거', '국회'
];

export function filterAndCategorize(items: CollectedItem[]): FilteredResult {
  const result: FilteredResult = {
    aiVibe: [],
    localBiz: [],
    excluded: []
  };

  for (const item of items) {
    const text = `${item.title} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
    
    // 제외 키워드 체크
    const shouldExclude = EXCLUDE_KEYWORDS.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    if (shouldExclude) {
      result.excluded.push(item);
      continue;
    }

    // 카테고리 스코어 계산
    const aiScore = calculateCategoryScore(text, AI_VIBE_KEYWORDS);
    const bizScore = calculateCategoryScore(text, LOCAL_BIZ_KEYWORDS);

    // 임계값 조정 (더 엄격한 선정)
    const threshold = 4; // 3에서 4로 상향
    
    // 점수 차이가 명확해야 함 (최소 2점 차이)
    const scoreDiff = Math.abs(aiScore - bizScore);
    
    if ((aiScore >= threshold || bizScore >= threshold) && scoreDiff >= 2) {
      if (aiScore > bizScore) {
        item.category = 'ai-vibe';
        result.aiVibe.push(item);
      } else {
        item.category = 'local-biz';
        result.localBiz.push(item);
      }
    } else if (aiScore >= threshold && bizScore < threshold) {
      // AI 점수만 임계값 이상
      item.category = 'ai-vibe';
      result.aiVibe.push(item);
    } else if (bizScore >= threshold && aiScore < threshold) {
      // 자영업 점수만 임계값 이상
      item.category = 'local-biz';
      result.localBiz.push(item);
    } else {
      // 둘 다 임계값 미달이거나 점수 차이가 불명확
      result.excluded.push(item);
    }
  }

  return result;
}

function calculateCategoryScore(
  text: string,
  keywords: { keyword: string; weight: number }[]
): number {
  let score = 0;
  
  for (const { keyword, weight } of keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += weight;
    }
  }
  
  return score;
}

// 특정 카테고리에 맞는지 확인
export function matchesCategory(
  text: string,
  category: 'ai-vibe' | 'local-biz'
): boolean {
  const keywords = category === 'ai-vibe' ? AI_VIBE_KEYWORDS : LOCAL_BIZ_KEYWORDS;
  const score = calculateCategoryScore(text.toLowerCase(), keywords);
  return score >= 3;
}

// 기사 품질 필터 (너무 짧거나 스팸성 제거)
export function filterLowQuality(items: CollectedItem[]): CollectedItem[] {
  return items.filter(item => {
    // 제목이 너무 짧음
    if (item.title.length < 10) return false;
    
    // 제목에 광고성 문구
    const adPhrases = ['[광고]', '[PR]', '[협찬]', '스폰서'];
    if (adPhrases.some(phrase => item.title.includes(phrase))) return false;
    
    // 요약이 있으면 최소 길이 체크
    if (item.summary && item.summary.length < 20) return false;
    
    return true;
  });
}

