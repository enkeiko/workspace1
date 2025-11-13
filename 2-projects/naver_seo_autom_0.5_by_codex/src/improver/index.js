import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { buildIntroSections, composeIntroText, buildNewsCalendar, buildVisualSuggestions, lintGuidebookCompliance } from './guidebook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function proposeKeywords(analysis) {
  const proposed = [];
  const base = analysis?.keywords || { core: [], region: [], attributes: [] };
  // 단순 규칙: 코어/지역 키워드를 일부 결합 제안(실서비스 룰은 추후 보강)
  base.core.slice(0,3).forEach(c => base.region.slice(0,2).forEach(r => proposed.push(`${r} ${c}`.trim())));
  return Array.from(new Set(proposed)).slice(0,20);
}

function generateIntro(analysis) {
  const sections = buildIntroSections(analysis);
  return composeIntroText(sections, 1200);
}

// moved to guidebook.js as buildNewsCalendar

function buildReviewTemplates() {
  return [
    { type: 'short', content: '방문 감사합니다! 어떤 점이 가장 만족스러우셨나요?' },
    { type: 'detail', content: '메뉴/서비스/분위기 중 특히 좋았던 점을 알려주세요.' }
  ];
}

// moved to guidebook.js as buildVisualSuggestions

function proposeNAPCorrections(analysis) {
  const nap = analysis?.analysis?.nap_mismatch;
  if (!nap) return [];
  const recs = [];
  if (nap.name) recs.push('상호명(N) 불일치: 네이버 등록명과 intake 비교 후 통일');
  if (nap.phone) recs.push('전화(P) 불일치: 하이픈/국번 포함 형식 통일');
  if (nap.address) recs.push('주소(A) 불일치: 도로명/지번 중 하나로 기준 통일');
  return recs;
}

export async function runImprover(brandArg) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const baseDir = path.join(__dirname, '../../clients', brand);
  const analysis = JSON.parse(await fs.readFile(path.join(baseDir, 'analysis.json'), 'utf-8'));

  const improved = {
    ...analysis,
    improvements: {
      keyword_proposals: proposeKeywords(analysis),
      intro_text: generateIntro(analysis),
      news_calendar: buildNewsCalendar(analysis),
      review_templates: buildReviewTemplates(),
      visual_suggestions: buildVisualSuggestions(analysis),
      nap_corrections: proposeNAPCorrections(analysis)
    }
  };

  // 가이드북 준수 린트 결과
  const lint = lintGuidebookCompliance(improved.improvements.intro_text || '');
  improved.analysis = improved.analysis || {};
  improved.analysis.guidebook_compliance = lint;

  await fs.writeFile(path.join(baseDir, 'improved.json'), JSON.stringify(improved, null, 2), 'utf-8');
  logger.info(`improved.json written: ${path.join(baseDir, 'improved.json')}`);
}

const isCli = (() => {
  const arg = process.argv[1] || '';
  return /[\\\/]improver[\\\/]index\.js$/i.test(arg);
})();

if (isCli) {
  runImprover().catch(e => { console.error(e); process.exit(1); });
}
