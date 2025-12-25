import { CollectedItem } from '../collectors/types';

// 간단한 요약 생성 (AI API 없이 규칙 기반)
export function generateSummary(title: string, content: string): string {
  if (!content || content.length < 50) {
    return extractKeyInfo(title);
  }

  // 첫 2-3문장 추출
  const sentences = content
    .replace(/\s+/g, ' ')
    .split(/[.!?。]\s+/)
    .filter(s => s.length > 20 && s.length < 200);
  
  if (sentences.length === 0) {
    return extractKeyInfo(title);
  }

  // 가장 정보가 많은 문장 선택
  const scoredSentences = sentences.map(sentence => ({
    text: sentence,
    score: scoreSentence(sentence)
  }));

  scoredSentences.sort((a, b) => b.score - a.score);
  
  // 상위 3-4개 문장 조합 (더 자세한 요약)
  const selectedSentences = scoredSentences
    .slice(0, 4)
    .map(s => s.text.trim());

  // 요약 길이를 400자까지 확장 (더 자세한 정보 제공)
  let summary = selectedSentences.join('. ');
  if (summary.length > 400) {
    summary = summary.slice(0, 397) + '...';
  } else if (summary.length < 100) {
    // 요약이 너무 짧으면 제목 정보 추가
    summary = `${summary} ${title}에 대한 상세 내용은 원문을 확인하세요.`;
  }

  return summary;
}

function scoreSentence(sentence: string): number {
  let score = 0;
  
  // 숫자/통계가 있으면 가산점
  if (/\d+%|\d+억|\d+만/.test(sentence)) score += 2;
  
  // 인용구가 있으면 가산점
  if (/"[^"]+"/.test(sentence)) score += 1;
  
  // 핵심 동사가 있으면 가산점
  const keyVerbs = ['발표', '출시', '공개', '개발', '성장', '증가', '달성'];
  for (const verb of keyVerbs) {
    if (sentence.includes(verb)) score += 1;
  }
  
  // 너무 짧거나 긴 문장 감점
  if (sentence.length < 30) score -= 1;
  if (sentence.length > 150) score -= 0.5;
  
  return score;
}

function extractKeyInfo(title: string): string {
  // 제목에서 핵심 정보 추출
  return `${title}에 대한 최신 소식입니다. 자세한 내용은 원문을 확인하세요.`;
}

// 액션 아이디어 생성
export function generateActionIdea(item: CollectedItem): string {
  const text = `${item.title} ${item.summary || ''}`.toLowerCase();
  
  // AI/바이브코딩 카테고리
  if (item.category === 'ai-vibe') {
    return generateAiVibeAction(text, item.title);
  }
  
  // 자영업/네이버 플레이스 카테고리
  if (item.category === 'local-biz') {
    return generateLocalBizAction(text, item.title);
  }
  
  return '원문을 참고하여 비즈니스에 적용해보세요.';
}

function generateAiVibeAction(text: string, title: string): string {
  // ChatGPT / AI 도구 관련
  if (text.includes('chatgpt') || text.includes('gpt')) {
    return 'ChatGPT를 활용해 반복 업무를 자동화하는 프롬프트를 만들어보세요.';
  }
  
  // 자동화 관련
  if (text.includes('자동화') || text.includes('automation')) {
    return '매일 반복하는 작업 하나를 선택해 자동화 도구로 대체해보세요.';
  }
  
  // SaaS/수익화 관련
  if (text.includes('saas') || text.includes('수익화')) {
    return '내 전문 지식을 디지털 제품이나 서비스로 만들 수 있는지 검토해보세요.';
  }
  
  // 노코드 관련
  if (text.includes('노코드') || text.includes('no-code')) {
    return '아이디어를 노코드 도구로 빠르게 프로토타입 만들어 검증해보세요.';
  }
  
  // 프롬프트 관련
  if (text.includes('프롬프트') || text.includes('prompt')) {
    return '자주 쓰는 프롬프트를 템플릿화하여 재사용하세요.';
  }
  
  // 부업 관련
  if (text.includes('부업') || text.includes('사이드')) {
    return '주 업무 외 2-3시간을 투자해 작은 수익 실험을 시작해보세요.';
  }
  
  // API 관련
  if (text.includes('api')) {
    return '자주 사용하는 서비스의 API를 연동해 업무 효율을 높여보세요.';
  }
  
  // 기본값
  return '이 기술/트렌드를 내 업무나 사이드 프로젝트에 어떻게 적용할지 생각해보세요.';
}

function generateLocalBizAction(text: string, title: string): string {
  // 네이버 플레이스 관련
  if (text.includes('네이버 플레이스') || text.includes('플레이스')) {
    return '네이버 플레이스 정보를 최신으로 업데이트하고, 키워드를 점검해보세요.';
  }
  
  // 리뷰 관련
  if (text.includes('리뷰') || text.includes('후기')) {
    return '최근 받은 리뷰에 정성스러운 답변을 달아 고객과 소통하세요.';
  }
  
  // SEO 관련
  if (text.includes('seo') || text.includes('검색 최적화')) {
    return '매장 설명에 지역명 + 업종 키워드가 자연스럽게 포함되어 있는지 확인하세요.';
  }
  
  // 매출 관련
  if (text.includes('매출') || text.includes('객단가')) {
    return '인기 메뉴와 함께 추가 주문이 일어날 수 있는 세트/추천 구성을 만들어보세요.';
  }
  
  // 단골/재방문 관련
  if (text.includes('단골') || text.includes('재방문')) {
    return '재방문 고객에게 특별한 혜택이나 인사를 건네보세요.';
  }
  
  // 배달 관련
  if (text.includes('배달') || text.includes('배민')) {
    return '배달 앱 메뉴 사진과 설명을 더 매력적으로 업데이트해보세요.';
  }
  
  // 마케팅 관련
  if (text.includes('마케팅') || text.includes('홍보')) {
    return '이번 주 SNS에 올릴 컨텐츠 하나를 준비해보세요.';
  }
  
  // 이벤트 관련
  if (text.includes('이벤트') || text.includes('프로모션')) {
    return '간단한 리뷰 이벤트를 기획해 고객 참여를 유도해보세요.';
  }
  
  // 기본값
  return '이 전략을 우리 매장 상황에 맞게 적용할 방법을 고민해보세요.';
}

// 태그 자동 생성
export function generateTags(item: CollectedItem): string[] {
  const text = `${item.title} ${item.summary || ''}`.toLowerCase();
  const tags: Set<string> = new Set();
  
  // 카테고리별 태그 매핑
  const tagMappings: Record<string, string[]> = {
    // AI/바이브코딩
    'chatgpt': ['ChatGPT', 'AI'],
    'gpt': ['GPT', 'AI'],
    '클로드': ['Claude', 'AI'],
    'claude': ['Claude', 'AI'],
    '자동화': ['자동화'],
    '바이브코딩': ['바이브코딩'],
    'saas': ['SaaS'],
    '노코드': ['노코드'],
    '프롬프트': ['프롬프트'],
    '수익화': ['수익화'],
    '부업': ['부업'],
    'ai': ['AI'],
    '인공지능': ['AI'],
    
    // 자영업/네이버 플레이스
    '네이버 플레이스': ['네이버플레이스'],
    '플레이스': ['네이버플레이스'],
    '리뷰': ['리뷰마케팅'],
    'seo': ['로컬SEO'],
    '자영업': ['자영업'],
    '소상공인': ['자영업'],
    '매출': ['매출'],
    '오프라인': ['오프라인'],
    '마케팅': ['마케팅'],
  };
  
  for (const [keyword, mappedTags] of Object.entries(tagMappings)) {
    if (text.includes(keyword)) {
      mappedTags.forEach(tag => tags.add(tag));
    }
  }
  
  // 최대 5개 태그
  return Array.from(tags).slice(0, 5);
}

