import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function exists(p){ try{ await fs.access(p); return true; } catch { return false; } }
async function ensureDir(p){ await fs.mkdir(p,{recursive:true}); }

async function copyDir(src, dest){
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });
  for(const e of entries){
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if(e.isDirectory()) await copyDir(s,d);
    else if(e.isFile()) await fs.copyFile(s,d);
  }
}

async function moveDir(src, dest){
  try {
    await ensureDir(path.dirname(dest));
    await fs.rename(src, dest);
  } catch (e) {
    // cross-device or lock fallback to copy
    await copyDir(src, dest);
    // best-effort remove
    try { await fs.rm(src, { recursive: true, force: true }); } catch {}
  }
}

async function findCandidates(){
  const candidates = [];
  const projects = path.join(root, '2-projects');
  if(!(await exists(projects))) return candidates;
  // Hard-coded legacy candidates (확장 가능)
  const hard = [
    'place-keywords-maker-v1',
    path.join('place-crawler','V1'),
  ];
  for(const rel of hard){
    const p = path.join(projects, rel);
    if(await exists(p)) candidates.push({ rel:`2-projects/${rel}`.replace(/\\/g,'/'), abs:p });
  }
  return candidates;
}

async function main(){
  const apply = process.argv.includes('--apply');
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g,'-');
  const archiveRoot = path.join(root, '9-archive', ts);
  const manifest = { ts, actions: [], note: 'Moved legacy projects into 9-archive' };

  const cands = await findCandidates();
  if(!cands.length){
    console.log('이동 대상 레거시 프로젝트가 없습니다.');
    return;
  }
  console.log('대상 목록:');
  cands.forEach(c => console.log(' -', c.rel));

  if(!apply){
    console.log('\n드라이런 모드입니다. 실제 이동하려면 --apply 옵션을 사용하세요.');
    return;
  }

  for(const c of cands){
    const dest = path.join(archiveRoot, c.rel);
    await moveDir(c.abs, dest);
    manifest.actions.push({ from: c.rel, to: path.relative(root, dest).replace(/\\/g,'/') });
    console.log(`이동 완료: ${c.rel} -> ${path.relative(root, dest).replace(/\\/g,'/')}`);
  }

  const opsDir = path.join(root, 'docs', 'ops');
  await ensureDir(opsDir);
  const mf = path.join(opsDir, `consolidate_manifest_${ts}.json`);
  await fs.writeFile(mf, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('매니페스트 저장:', path.relative(root, mf));
}

if(import.meta.url === `file://${process.argv[1]}` || /[\\\/]scripts[\\\/]workspace_consolidate\.js$/i.test(process.argv[1]||'')){
  main().catch(e => { console.error(e); process.exit(1); });
}

