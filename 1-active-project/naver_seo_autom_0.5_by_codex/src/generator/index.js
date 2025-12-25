import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildGuidebook(improved) {
  const b = improved?.client?.business || {};
  const k = improved?.keywords || { core: [], region: [], attributes: [] };
  const napCorr = improved?.improvements?.nap_corrections || [];
  return [
    `# Guidebook`,
    ``,
    `## Business`,
    `- Name: ${b.name || ''}`,
    `- Category: ${b.category?.primary || ''}`,
    `- Address: ${b.address?.raw || ''}`,
    ``,
    `## Keywords`,
    `- Core: ${k.core.join(', ')}`,
    `- Region: ${k.region.join(', ')}`,
    `- Attributes: ${k.attributes.join(', ')}`,
    ``,
    `## Improvements`,
    `- Intro: ${improved?.improvements?.intro_text || ''}`,
    `- NAP Corrections:`,
    ...napCorr.map(v => `  - ${v}`),
  ].join('\n');
}

function buildChecklist(improved) {
  const missing = improved?.analysis?.missing || [];
  const compliance = improved?.analysis?.guidebook_compliance || { ok: true, issues: [] };
  const gbItems = (compliance.issues || []).map(i => `- [ ] 가이드북: ${i}`);
  const napCorr = improved?.improvements?.nap_corrections || [];
  return [
    `# Deploy Checklist`,
    `- [ ] NAP 확인`,
    ...missing.map(m => `- [ ] 채움: ${m}`),
    ...gbItems,
    ...napCorr.map(v => `- [ ] 보정: ${v}`),
    `- [ ] 대표 사진 5장 이상 등록`,
    `- [ ] 카테고리/메뉴 최종 점검`
  ].join('\n');
}

function buildAudit(improved) {
  return {
    schema_version: improved?.meta?.schema_version || '',
    generated_at: new Date().toISOString(),
    checks: {
      nap_mismatch: improved?.analysis?.nap_mismatch || {},
      missing: improved?.analysis?.missing || []
    }
  };
}

export async function runGenerator(brandArg) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const baseDir = path.join(__dirname, '../../clients', brand);
  await fs.mkdir(path.join(baseDir, 'outputs'), { recursive: true });
  const improved = JSON.parse(await fs.readFile(path.join(baseDir, 'improved.json'), 'utf-8'));

  const guidebook = buildGuidebook(improved);
  const checklist = buildChecklist(improved);
  const audit = buildAudit(improved);

  await fs.writeFile(path.join(baseDir, 'outputs', 'Guidebook.md'), guidebook, 'utf-8');
  await fs.writeFile(path.join(baseDir, 'outputs', 'Deploy_Checklist.md'), checklist, 'utf-8');
  await fs.writeFile(path.join(baseDir, 'outputs', 'audit_report.json'), JSON.stringify(audit, null, 2), 'utf-8');

  logger.info('Generator outputs written to outputs/');
}

const isCli = (() => {
  const arg = process.argv[1] || '';
  return /[\\\/]generator[\\\/]index\.js$/i.test(arg);
})();

if (isCli) {
  runGenerator().catch(e => { console.error(e); process.exit(1); });
}
