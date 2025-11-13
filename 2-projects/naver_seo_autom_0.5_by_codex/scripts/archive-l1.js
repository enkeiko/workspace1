import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }

async function copySafe(src, dest) {
  if (await exists(src)) {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
    return true;
  }
  return false;
}

async function copyDirRecursive(src, dest) {
  if (!(await exists(src))) return false;
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDirRecursive(s, d);
    } else if (e.isFile()) {
      await fs.copyFile(s, d);
    }
  }
  return true;
}

async function main() {
  // Usage: node scripts/archive-l1.js BRAND [DEST_DIR]
  const brand = process.argv[2] || 'sample_brand';
  const destArg = process.argv[3] || '';
  const base = path.join(__dirname, '..');
  const clientDir = path.join(base, 'clients', brand);
  const existsBrand = await exists(clientDir);
  if (!existsBrand) {
    console.error('브랜드 디렉터리를 찾을 수 없습니다:', clientDir);
    process.exit(2);
  }
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const destRoot = destArg ? path.resolve(destArg) : path.join(clientDir, 'archives');
  const dest = path.join(destRoot, ts);
  await ensureDir(dest);

  // Copy key artifacts
  const files = ['intake.json', 'collector.json', 'analysis.json', 'improved.json'];
  for (const f of files) {
    await copySafe(path.join(clientDir, f), path.join(dest, f));
  }
  // Copy outputs and inputs if exist
  await copyDirRecursive(path.join(clientDir, 'outputs'), path.join(dest, 'outputs'));
  await copyDirRecursive(path.join(clientDir, 'inputs'), path.join(dest, 'inputs'));

  console.log('아카이브 완료:', dest);
}

if (process.argv[1] && /[\\\/]scripts[\\\/]archive-l1\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}

