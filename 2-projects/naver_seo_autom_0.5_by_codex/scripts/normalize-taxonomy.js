import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function tryYamlBlocks(text) {
  const blocks = [];
  const fence = /```yaml([\s\S]*?)```/gi;
  let m; while ((m = fence.exec(text)) !== null) { blocks.push(m[1]); }
  return blocks;
}

function collectKeyValues(text) {
  const out = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_\-\.]+):\s*(.+)$/);
    if (m) { out[m[1]] = m[2]; }
  }
  return out;
}

async function main() {
  const shared = path.join(__dirname, '..', 'shared');
  const src = path.join(shared, 'keyword_meta_taxonomy.yaml');
  const dst = path.join(shared, 'keyword_meta_taxonomy.normalized.json');
  const txt = await fs.readFile(src, 'utf-8');
  let result = {};
  // 1) fenced yaml blocks
  const blocks = tryYamlBlocks(txt);
  for (const b of blocks) {
    try { const obj = yaml.load(b); Object.assign(result, obj); } catch {}
  }
  // 2) fallback: simple key: value lines
  if (!Object.keys(result).length) {
    const kv = collectKeyValues(txt);
    if (Object.keys(kv).length) result = { _kv: kv };
  }
  // 3) final fallback: empty but keep meta
  if (!Object.keys(result).length) result = { _note: 'taxonomy parse failed - using empty' };

  await fs.writeFile(dst, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Normalized taxonomy written:', dst);
}

if (process.argv[1] && /[\\\/]scripts[\\\/]normalize-taxonomy\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}

