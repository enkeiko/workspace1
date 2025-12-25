import { CollectedItem } from '../collectors/types';

export interface ArticleScores {
  practicality: number;      // 실용성 (0-10)
  profitPotential: number;   // 수익 직결 가능성 (0-10)
  scalability: number;       // 확장 가능성 (0-10)
  total: number;             // 종합 점수 (0-10)
}

// 실용성 키워드
const PRACTICALITY_KEYWORDS: { keyword: string; score: number }[] = [
  { keyword: '방법', score: 2 },
  { keyword: '가이드', score: 2 },
  { keyword: '튜토리얼', score: 2 },
  { keyword: '따라하', score: 2 },
  { keyword: '단계별', score: 2 },
  { keyword: '실전', score: 2 },
  { keyword: '적용', score: 1.5 },
  { keyword: '구현', score: 1.5 },
  { keyword: '설정', score: 1 },
  { keyword: '활용', score: 1.5 },
  { keyword: '팁', score: 1.5 },
  { keyword: '노하우', score: 2 },
  { keyword: '비법', score: 1.5 },
  { keyword: '예시', score: 1 },
  { keyword: '사례', score: 1.5 },
  { keyword: '템플릿', score: 2 },
  { keyword: '무료', score: 1 },
];

// 수익 관련 키워드
const PROFIT_KEYWORDS: { keyword: string; score: number }[] = [
  { keyword: '수익', score: 2 },
  { keyword: '매출', score: 2 },
  { keyword: '돈', score: 1.5 },
  { keyword: '버는', score: 2 },
  { keyword: '벌기', score: 2 },
  { keyword: '부업', score: 2 },
  { keyword: '월급', score: 1 },
  { keyword: '수입', score: 1.5 },
  { keyword: '자동 수익', score: 3 },
  { keyword: '패시브', score: 2 },
  { keyword: 'passive', score: 2 },
  { keyword: '구독', score: 1.5 },
  { keyword: '결제', score: 1 },
  { keyword: '판매', score: 1.5 },
  { keyword: '고객', score: 1 },
  { keyword: '비용 절감', score: 1.5 },
  { keyword: '효율', score: 1 },
];

// 확장성 키워드
const SCALABILITY_KEYWORDS: { keyword: string; score: number }[] = [
  { keyword: '자동화', score: 2 },
  { keyword: '자동', score: 1.5 },
  { keyword: '스케일', score: 2 },
  { keyword: '확장', score: 2 },
  { keyword: '성장', score: 1.5 },
  { keyword: '반복', score: 1.5 },
  { keyword: '시스템', score: 1 },
  { keyword: '플랫폼', score: 1.5 },
  { keyword: 'saas', score: 2 },
  { keyword: '구독 모델', score: 2 },
  { keyword: '프레임워크', score: 1.5 },
  { keyword: '워크플로우', score: 2 },
  { keyword: 'api', score: 1.5 },
  { keyword: '연동', score: 1 },
  { keyword: '통합', score: 1 },
  { keyword: '복제', score: 1.5 },
];

// 신뢰도 가산점 소스
const TRUSTED_SOURCES: Record<string, number> = {
  'ZDNet Korea': 1.5,
  '블로터': 1.5,
  'ITWorld Korea': 1.5,
  '한국경제': 1.3,
  '매일경제': 1.3,
  '테크니들': 1.4,
  '벤처스퀘어': 1.4,
  'Byline Network': 1.4,
  'Velog': 1.2,
  'Brunch': 1.2,
};

export function scoreArticle(item: CollectedItem): ArticleScores {
  const text = `${item.title} ${item.summary || ''} ${item.content || ''}`.toLowerCase();
  
  // 각 항목별 점수 계산 (0-10)
  let practicality = calculateKeywordScore(text, PRACTICALITY_KEYWORDS);
  let profitPotential = calculateKeywordScore(text, PROFIT_KEYWORDS);
  let scalability = calculateKeywordScore(text, SCALABILITY_KEYWORDS);
  
  // 카테고리별 가중치 조정
  if (item.category === 'ai-vibe') {
    // AI/자동화 카테고리는 확장성에 가산점
    scalability *= 1.2;
  } else if (item.category === 'local-biz') {
    // 자영업 카테고리는 실용성과 수익에 가산점
    practicality *= 1.2;
    profitPotential *= 1.1;
  }
  
  // 소스 신뢰도 보너스
  const sourceBonus = TRUSTED_SOURCES[item.source] || 1;
  
  // 점수 정규화 (0-10)
  practicality = normalizeScore(practicality * sourceBonus);
  profitPotential = normalizeScore(profitPotential * sourceBonus);
  scalability = normalizeScore(scalability * sourceBonus);
  
  // 종합 점수 (가중 평균)
  const total = normalizeScore(
    (practicality * 0.35) + (profitPotential * 0.4) + (scalability * 0.25)
  ) * 10 / 10; // 0-10 범위
  
  return {
    practicality: Math.round(practicality * 10) / 10,
    profitPotential: Math.round(profitPotential * 10) / 10,
    scalability: Math.round(scalability * 10) / 10,
    total: Math.round(total * 10) / 10
  };
}

function calculateKeywordScore(
  text: string,
  keywords: { keyword: string; score: number }[]
): number {
  let score = 0;
  
  for (const { keyword, score: keywordScore } of keywords) {
    // 키워드 등장 횟수에 따른 점수 (최대 3회까지)
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    if (matches) {
      const count = Math.min(matches.length, 3);
      score += keywordScore * count;
    }
  }
  
  // 제목에 키워드가 있으면 추가 보너스
  const titleScore = keywords.reduce((acc, { keyword, score: s }) => {
    if (text.slice(0, 100).includes(keyword)) {
      return acc + s * 0.5;
    }
    return acc;
  }, 0);
  
  return score + titleScore;
}

function normalizeScore(score: number): number {
  // 점수를 0-10 범위로 정규화
  const maxExpectedScore = 20;
  const normalized = Math.min(score / maxExpectedScore * 10, 10);
  return Math.round(normalized * 10) / 10;
}

// 인기 점수 계산 (조회수, 좋아요, 댓글 기반)
export function calculatePopularityScore(
  viewCount: number,
  likeCount: number,
  commentCount: number
): number {
  // 가중치: 좋아요 > 댓글 > 조회수
  const score = (likeCount * 3) + (commentCount * 2) + (viewCount * 0.01);
  return normalizeScore(score);
}

// 시간 기반 감쇠 (최신 기사에 가산점)
export function applyTimeDecay(
  score: number,
  publishedAt: Date
): number {
  const now = new Date();
  const hoursSincePublish = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
  
  // 24시간 이내: 100%, 48시간: 80%, 72시간: 60%...
  const decayFactor = Math.max(0.3, 1 - (hoursSincePublish / 168)); // 1주일 기준
  
  return score * decayFactor;
}

