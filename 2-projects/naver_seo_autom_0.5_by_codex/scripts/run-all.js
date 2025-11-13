import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run(nodeArgs, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { brand: 'sample_brand', mock: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '-b' || a === '--brand') && args[i+1]) { opts.brand = args[++i]; continue; }
    if (a === '--mock') { opts.mock = true; continue; }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const env = opts.mock ? { MOCK_COLLECTOR: '1' } : {};
  // Ensure taxonomy is normalized before running
  await run(['scripts/normalize-taxonomy.js']);

  await run(['src/collector/index.js', opts.brand], env);
  await run(['src/analyzer/index.js', opts.brand]);
  await run(['src/improver/index.js', opts.brand]);
  await run(['src/generator/index.js', opts.brand]);
  await run(['scripts/validate.js', opts.brand]);
}

if (process.argv[1] && /[\\\/]scripts[\\\/]run-all\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
