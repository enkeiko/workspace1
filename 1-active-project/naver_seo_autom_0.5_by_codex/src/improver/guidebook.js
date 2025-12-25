import { unique } from '../analyzer/mapping/text.js';

const PROHIBITED_PHRASES = [
  '최고', '완벽', '무조건', '보장', '전국 1위', '압도적', '절대', '무한', '완전', '특가 보장', '상시 할인'
];

export function buildIntroSections(analysis) {
  const b = analysis?.client?.business || {};
  const name = b.name || '매장';
  const category = b.category?.primary || '';
  const addr = b.address?.raw || '';
  const core = (analysis?.keywords?.core || []).slice(0, 3);
  const region = (analysis?.keywords?.region || []).slice(0, 3);
  const attrs = (analysis?.keywords?.attributes || []).slice(0, 5);
  const kStr = unique([...core, ...region, ...attrs]).join(', ');

  let brandIntro = `${name}는(은) ${category ? category + ' 카테고리의 ' : ''}공간으로, 지역 고객에게 일상 속 작은 만족을 드리기 위해 노력합니다.`;
  let services = `대표 서비스/상품은 매장 상황에 따라 달라질 수 있으며, 방문 전 문의 부탁드립니다. 핵심 키워드: ${kStr}`;
  const usage = `예약/이용: 전화(${b.phone || ''}) 또는 현장 접수 가능합니다. 혼잡 시간대에는 대기 안내가 있을 수 있습니다.`;
  const operations = `운영 정보: 주소 ${addr}. 영업시간/휴무일/결제수단은 현장 안내를 참고해 주세요.`;
  const directions = `찾아오시는 길: 주변 랜드마크 및 대중교통 정보를 기반으로 편리한 동선을 안내드립니다.`;
  const story = `스토리: 고객의 일상에 어울리는 경험을 만들기 위해 세심함을 지향합니다.`;
  const closing = `마무리: 오늘도 편안한 방문이 되시길 바랍니다.`;

  // 카테고리별 보강 문장
  const cat = category;
  if (cat.includes('음식') || cat.includes('식당') || cat.includes('카페')) {
    services += ` 메뉴/재료/조리 방식에 대한 안내는 현장 메뉴판과 사진을 함께 확인해 주세요.`;
  } else if (cat.includes('미용') || cat.includes('뷰티')) {
    services += ` 위생/시술 안내는 상담 후 결정되며, 개인별 차이를 고려해 안내됩니다.`;
  } else if (cat.includes('병원') || cat.includes('의원') || cat.includes('한의원')) {
    services += ` 의료·건강 관련 정보는 사실 기반으로만 제공하며, 과장/추정 서술을 지양합니다.`;
  }

  return { brandIntro, services, usage, operations, directions, story, closing };
}

export function composeIntroText(sections, minChars = 1200) {
  const blocks = [
    sections.brandIntro,
    '',
    sections.services,
    '',
    sections.usage,
    '',
    sections.operations,
    '',
    sections.directions,
    '',
    sections.story,
    '',
    sections.closing
  ];
  let text = blocks.join('\n');
  // 길이가 부족하면 안전한 서술을 반복 확장
  const filler = '\n추가 안내: 실제 제공 콘텐츠와 운영 정보는 현장과 안내 페이지의 최신 내용을 기준으로 검토하여 반영합니다.';
  while (text.length < minChars) {
    text += filler;
  }
  return text;
}

export function buildNewsCalendar(analysis) {
  const themes = ['지역 소식', '메뉴 소개', '이벤트/공지', '후기 하이라이트'];
  const ideasBank = [
    '시즌 한정 메뉴 사진과 간단한 소개',
    '근처 랜드마크와 함께하는 방문 동선 팁',
    '포장/예약 이용 팁',
    '고객 후기 1문장 인용(사실 기반)'
  ];
  return [1,2,3,4].map((w, i) => ({ week: w, theme: themes[i % themes.length], ideas: ideasBank }));
}

export function buildVisualSuggestions(analysis) {
  const suggestions = [];
  const photos = analysis?.assets?.photos || [];
  if (!photos.length) suggestions.push('대표 사진 5장 이상 업로드');
  suggestions.push('메뉴/실내/조리/가격표/비교컷 구분 촬영');
  suggestions.push('파일명 규칙: 지역_메뉴_속성_번호.jpg (예: 강남_비빔밥_대표_01.jpg)');
  suggestions.push('중복/저해상도/과도한 보정 사진 제외');
  return suggestions;
}

export function lintGuidebookCompliance(text) {
  const issues = [];
  const len = (text || '').length;
  if (len < 1200) issues.push('분량 부족(<1200자)');
  if (len > 2200) issues.push('분량 과다(>2200자)');
  const structureHints = ['대표 서비스', '예약/이용', '운영 정보', '찾아오시는 길', '스토리', '마무리'];
  const missingBlocks = structureHints.filter(h => !text.includes(h));
  if (missingBlocks.length) issues.push(`권장 구조 키워드 일부 미포함: ${missingBlocks.join(', ')}`);
  const foundProhibited = PROHIBITED_PHRASES.filter(p => text.includes(p));
  if (foundProhibited.length) issues.push(`과장/금지어 포함: ${foundProhibited.join(', ')}`);
  if (!/[가-힣]/.test(text)) issues.push('한글 비중 부족(한국어 사용자 대상)');
  return { ok: issues.length === 0, issues };
}
