import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function statOrNull(p) { try { return await fs.stat(p); } catch { return null; } }

async function listClients(baseDir) {
  const clientsDir = path.join(baseDir, 'clients');
  const items = await fs.readdir(clientsDir, { withFileTypes: true });
  const brands = items.filter(d => d.isDirectory()).map(d => d.name);
  const results = [];
  for (const brand of brands) {
    const dir = path.join(clientsDir, brand);
    const collector = path.join(dir, 'collector.json');
    if (await exists(collector)) {
      const st = await statOrNull(collector);
      const analysis = await exists(path.join(dir, 'analysis.json'));
      const improved = await exists(path.join(dir, 'improved.json'));
      const outputs = await exists(path.join(dir, 'outputs'));
      results.push({
        brand,
        collector_path: path.relative(baseDir, collector).replace(/\\/g, '/'),
        collector_mtime: st ? st.mtime.toISOString() : null,
        collector_size: st ? st.size : null,
        has_analysis: analysis,
        has_improved: improved,
        has_outputs: outputs,
      });
    }
  }
  return results.sort((a,b) => String(a.brand).localeCompare(String(b.brand)));
}

async function main() {
  const base = path.join(__dirname, '..');
  const jsonMode = process.argv.includes('--json');
  const list = await listClients(base);
  if (jsonMode) {
    console.log(JSON.stringify(list, null, 2));
    return;
  }
  if (!list.length) {
    console.log('L1이 수행된 클라이언트(collector.json)가 없습니다.');
    return;
  }
  console.log('브랜드  | collector.json                | mtime (UTC)                 | size  | analysis | improved | outputs');
  console.log('-'.repeat(110));
  for (const r of list) {
    const row = [
      r.brand.padEnd(7, ' '),
      r.collector_path.padEnd(30, ' '),
      String(r.collector_mtime || '').padEnd(27, ' '),
      String(r.collector_size || '').padEnd(6, ' '),
      String(r.has_analysis).padEnd(8, ' '),
      String(r.has_improved).padEnd(8, ' '),
      String(r.has_outputs).padEnd(7, ' '),
    ].join(' | ');
    console.log(row);
  }
}

if (process.argv[1] && /[\\\/]scripts[\\\/]list-l1\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}

