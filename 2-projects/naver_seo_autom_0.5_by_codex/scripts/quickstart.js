import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    brand: 'sample_brand',
    place: '1265317185',
    name: '샘플가게',
    phone: '02-000-0000',
    address: '서울특별시 강남구 테헤란로 1',
    category: '음식점',
    mock: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = () => args[++i];
    if ((a === '-b' || a === '--brand') && args[i+1]) opts.brand = next();
    else if ((a === '-p' || a === '--place') && args[i+1]) opts.place = next();
    else if (a === '--name' && args[i+1]) opts.name = next();
    else if (a === '--phone' && args[i+1]) opts.phone = next();
    else if (a === '--address' && args[i+1]) opts.address = next();
    else if (a === '--category' && args[i+1]) opts.category = next();
    else if (a === '--mock') opts.mock = true;
  }
  return opts;
}

async function ensureIntake(root, opts) {
  const clientDir = path.join(root, 'clients', opts.brand);
  await fs.mkdir(clientDir, { recursive: true });
  const intakePath = path.join(clientDir, 'intake.json');
  const intake = {
    brand: opts.brand,
    place_id: String(opts.place),
    business: {
      name: opts.name,
      phone: opts.phone,
      address: { raw: opts.address },
      category: { primary: opts.category, subcategories: [] },
      web: { website: '', sns: {} },
      ops: {},
    },
  };
  await fs.writeFile(intakePath, JSON.stringify(intake, null, 2), 'utf-8');
  return { clientDir, intakePath };
}

function run(nodeArgs, env = {}, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
  });
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(__filename), '..');
  const opts = parseArgs();
  const { clientDir } = await ensureIntake(root, opts);
  const env = opts.mock ? { MOCK_COLLECTOR: '1' } : {};
  await run(['scripts/run-all.js', '--brand', opts.brand, ...(opts.mock ? ['--mock'] : [])], env, root);
  console.log('\n완료: 산출물 경로 →', path.join(clientDir, 'outputs'));
}

if (process.argv[1] && /[\\\/]scripts[\\\/]quickstart\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
