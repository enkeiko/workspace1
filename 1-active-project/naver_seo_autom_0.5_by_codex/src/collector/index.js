import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// PlaceCrawler는 실제 크롤 모드에서만 동적 임포트하여 puppeteer 의존 최소화
import { logger } from '../utils/logger.js';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadTaxonomy() {
  const p = path.join(__dirname, '../../shared/keyword_meta_taxonomy.yaml');
  const normalized = path.join(__dirname, '../../shared/keyword_meta_taxonomy.normalized.json');
  try {
    // 우선 정규화된 JSON 사용
    const norm = JSON.parse(await fs.readFile(normalized, 'utf-8'));
    return norm;
  } catch {}
  // 없으면 즉시 정규화 시도
  try {
    const script = path.join(__dirname, '../../scripts/normalize-taxonomy.js');
    const { spawn } = await import('child_process');
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script], { stdio: 'ignore' });
      child.on('exit', code => code === 0 ? resolve() : reject(new Error('normalize failed')));
    });
    const norm = JSON.parse(await fs.readFile(normalized, 'utf-8'));
    return norm;
  } catch (e) {
    // 최후: 원문을 YAML로 시도 후 실패 시 빈 객체
    try {
      const txt = await fs.readFile(p, 'utf-8');
      return yaml.load(txt) || {};
    } catch (err) {
      logger.warn('Taxonomy 파싱 실패. 빈 객체로 진행:', err.message);
      return {};
    }
  }
}

function detectNAPMismatch(intakeBiz, collected) {
  const nameMismatch = !!(intakeBiz?.name && collected?.name && intakeBiz.name.trim() !== collected.name.trim());
  const phoneMismatch = !!(intakeBiz?.phone && collected?.phone && intakeBiz.phone.replace(/\D/g,'') !== (collected.phone||'').replace(/\D/g,''));
  const addrMismatch = !!(intakeBiz?.address?.raw && collected?.address && intakeBiz.address.raw.trim() !== collected.address.trim());
  return {
    name: nameMismatch,
    phone: phoneMismatch,
    address: addrMismatch,
    details: {
      intake: { name: intakeBiz?.name||'', phone: intakeBiz?.phone||'', address: intakeBiz?.address?.raw||'' },
      collected: { name: collected?.name||'', phone: collected?.phone||'', address: collected?.address||'' }
    }
  };
}

function prepareTaxonomyTags(collected, taxonomy) {
  // 간단 스텁: 카테고리명/주소 문자열에서 후보 속성 태깅 후보를 생성
  const tags = { core: [], region: [], attributes: [] };
  if (collected?.category) tags.core.push(collected.category);
  if (collected?.address) tags.region.push(collected.address);
  // taxonomy를 실제 매핑하는 로직은 후속 보강(룰/키워드 매칭)
  return tags;
}

function templateCollectorOutput(schemaBase, intake, collected, nap, tags) {
  return {
    ...schemaBase,
    client: {
      ...schemaBase.client,
      brand: intake?.brand || schemaBase.client.brand,
      place_id: intake?.place_id || schemaBase.client.place_id,
      business: intake?.business || schemaBase.client.business
    },
    keywords: { core: tags.core, region: tags.region, attributes: tags.attributes },
    assets: { photos: collected.photos||[], menus: collected.menu||[] },
    analysis: { ...schemaBase.analysis, nap_mismatch: nap },
    provenance: { ...schemaBase.provenance, collector: { source: 'naver_place' } }
  };
}

async function loadSchemaBase() {
  const schemaPath = path.join(__dirname, '../../shared/schema.json');
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));
  // 스키마의 기본 형태에서 빈 인스턴스 템플릿 생성(간단화)
  return {
    meta: { schema_version: schema.properties.meta.properties.schema_version.default, generated_at: new Date().toISOString() },
    client: { brand: '', place_id: '', business: { name:'', phone:'', address:{ raw:'' }, category:{ primary:'', subcategories:[] }, hours:null, web:{ website:'', sns:{} }, ops:{} } },
    keywords: { core: [], region: [], attributes: [] },
    assets: { photos: [], menus: [] },
    analysis: { issues: [], missing: [], relevance: {}, popularity: {}, trust: {}, nap_mismatch: { name:false, phone:false, address:false, details:{} } },
    improvements: { keyword_proposals: [], intro_text: '', news_calendar: [], review_templates: [], visual_suggestions: [] },
    provenance: { collector:{}, analyzer:{}, improver:{}, generator:{} }
  };
}

export async function runCollector(brandArg, options = {}) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const baseDir = path.join(__dirname, '../../clients', brand);
  const intakePath = path.join(baseDir, 'intake.json');
  const collectorPath = path.join(baseDir, 'collector.json');

  await fs.mkdir(baseDir, { recursive: true });
  const intake = JSON.parse(await fs.readFile(intakePath, 'utf-8'));
  const placeId = intake.place_id;

  let raw;
  const useMock = options.mock === true || process.env.MOCK_COLLECTOR === '1';
  if (useMock) {
    // 모의 수집 데이터(네트워크 의존 없는 로컬 실행용)
    raw = {
      id: placeId,
      name: intake?.business?.name || '샘플가게',
      category: intake?.business?.category?.primary || '카테고리',
      address: intake?.business?.address?.raw || '주소 미상',
      phone: intake?.business?.phone || '',
      photos: [],
      menu: [],
      reviews: [],
      hours: null,
      description: ''
    };
  } else {
    const { PlaceCrawler } = await import('./PlaceCrawler.js');
    const crawler = new PlaceCrawler({});
    try {
      await crawler.initialize();
      try {
        // 상세 수집(리뷰 포함) 사용
        raw = await crawler.crawlPlaceDetailed(placeId);
      } catch (e) {
        logger.warn('크롤 실패. 오프라인 입력으로 대체 시도:', e.message);
        raw = await tryOfflineInput(baseDir, intake, placeId);
      } finally {
        try { await crawler.close(); } catch {}
      }
    } catch (e) {
      logger.warn('Puppeteer 초기화 실패. 오프라인 입력으로 대체 시도:', e.message);
      raw = await tryOfflineInput(baseDir, intake, placeId);
    }
  }

  const nap = detectNAPMismatch(intake.business || {}, raw);
  const taxonomy = await loadTaxonomy();
  const tags = prepareTaxonomyTags(raw, taxonomy);
  const schemaBase = await loadSchemaBase();
  const out = templateCollectorOutput(schemaBase, intake, raw, nap, tags);
  await fs.writeFile(collectorPath, JSON.stringify(out, null, 2), 'utf-8');
  logger.info(`collector.json written: ${collectorPath}`);
  return out;
}

async function tryOfflineInput(baseDir, intake, placeId) {
  try {
    const rawPath = path.join(baseDir, 'inputs', 'raw.json');
    const obj = JSON.parse(await fs.readFile(rawPath, 'utf-8'));
    return { id: placeId, name: obj.name || intake?.business?.name || '', category: obj.category || '', address: obj.address || intake?.business?.address?.raw || '', phone: obj.phone || '', photos: obj.photos || [], menu: obj.menu || [], reviews: obj.reviews || [], hours: obj.hours || null, description: obj.description || '' };
  } catch {}
  try {
    const htmlPath = path.join(baseDir, 'inputs', 'page.html');
    const html = await fs.readFile(htmlPath, 'utf-8');
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [,''])[1];
    return { id: placeId, name: title || intake?.business?.name || '', category: '', address: intake?.business?.address?.raw || '', phone: intake?.business?.phone || '', photos: [], menu: [], reviews: [], hours: null, description: '' };
  } catch {}
  return { id: placeId, name: intake?.business?.name || '', category: intake?.business?.category?.primary || '', address: intake?.business?.address?.raw || '', phone: intake?.business?.phone || '', photos: [], menu: [], reviews: [], hours: null, description: '' };
}

const isCli = (() => {
  const arg = process.argv[1] || '';
  return /[\\\/]collector[\\\/]index\.js$/i.test(arg);
})();

if (isCli) {
  runCollector().catch(e => { console.error(e); process.exit(1); });
}
