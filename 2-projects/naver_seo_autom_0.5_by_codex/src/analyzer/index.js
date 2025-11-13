import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import yaml from 'js-yaml';
import { TaxonomyIndex } from './mapping/TaxonomyIndex.js';
import { KeywordMapper } from './mapping/KeywordMapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeKeywords(intake, collected) {
  const core = collected?.keywords?.core || [];
  const region = collected?.keywords?.region || [];
  const attributes = collected?.keywords?.attributes || [];

  // 간단한 주소 분해(입력의 raw에서 도시/구/동 후보 추출)
  const raw = intake?.business?.address?.raw || '';
  const tokens = raw.split(/\s+/).filter(Boolean);
  const regionHints = tokens.slice(0, 3);
  const mergedRegion = Array.from(new Set([...region, ...regionHints]));

  return { core, region: mergedRegion, attributes };
}

async function loadNormalizedTaxonomy(projectRoot) {
  try {
    const norm = await fs.readFile(path.join(projectRoot, 'shared/keyword_meta_taxonomy.normalized.json'), 'utf-8');
    return JSON.parse(norm);
  } catch {}
  try {
    const raw = await fs.readFile(path.join(projectRoot, 'shared/keyword_meta_taxonomy.yaml'), 'utf-8');
    return yaml.load(raw) || {};
  } catch (e) {
    logger.warn('taxonomy load failed in analyzer:', e.message);
    return {};
  }
}

function computeMetrics(collected) {
  // 검증 불가한 랭킹/가중 공식은 제거 ⇒ 값은 unknown으로 표기
  return {
    relevance: { score: 'unknown', basis: [] },
    popularity: { score: 'unknown', basis: [] },
    trust: { score: 'unknown', basis: [] }
  };
}

function detectIssues(collected) {
  const missing = [];
  if (!collected?.client?.business?.name) missing.push('business.name');
  if (!collected?.client?.business?.address?.raw) missing.push('business.address.raw');
  if (!collected?.assets?.photos?.length) missing.push('assets.photos');
  const issues = [];
  const phone = collected?.client?.business?.phone || '';
  const phoneDigits = phone.replace(/\D/g, '');
  if (phone && phoneDigits.length < 8) issues.push('business.phone.format_suspect');
  if (!collected?.client?.business?.category?.primary) missing.push('business.category.primary');
  return { missing, issues };
}

export async function runAnalyzer(brandArg) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const baseDir = path.join(__dirname, '../../clients', brand);
  const intake = JSON.parse(await fs.readFile(path.join(baseDir, 'intake.json'), 'utf-8'));
  const collected = JSON.parse(await fs.readFile(path.join(baseDir, 'collector.json'), 'utf-8'));

  // Build taxonomy index and map keywords with confidence/evidence
  const projectRoot = path.join(__dirname, '../../');
  const taxonomy = await loadNormalizedTaxonomy(projectRoot);
  const tIndex = new TaxonomyIndex(taxonomy);
  const mapper = new KeywordMapper(tIndex);
  const kw = mapper.map(intake, collected);
  const metrics = computeMetrics(collected);
  const checks = detectIssues(collected);

  const analysis = {
    ...collected,
    keywords: { core: kw.core, region: kw.region, attributes: kw.attributes, details: kw.details },
    analysis: { ...collected.analysis, ...metrics, missing: checks.missing, issues: checks.issues }
  };

  await fs.writeFile(path.join(baseDir, 'analysis.json'), JSON.stringify(analysis, null, 2), 'utf-8');
  logger.info(`analysis.json written: ${path.join(baseDir, 'analysis.json')}`);
}

const isCli = (() => {
  const arg = process.argv[1] || '';
  return /[\\\/]analyzer[\\\/]index\.js$/i.test(arg);
})();

if (isCli) {
  runAnalyzer().catch(e => { console.error(e); process.exit(1); });
}
