import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(brandArg) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const base = path.join(__dirname, '..', 'clients', brand);
  const improved = JSON.parse(await fs.readFile(path.join(base, 'improved.json'), 'utf-8'));
  const nap = improved?.analysis?.nap_mismatch || {};
  const missing = improved?.analysis?.missing || [];
  const gcomp = improved?.analysis?.guidebook_compliance || { ok: true, issues: [] };
  console.log('=== Pipeline Report ===');
  console.log('Brand:', brand);
  console.log('Place ID:', improved?.client?.place_id);
  console.log('\n[ NAP Mismatch ]');
  console.log('Name:', nap.name, 'Phone:', nap.phone, 'Address:', nap.address);
  if (nap.details) console.log('Details:', nap.details);
  console.log('\n[ Missing Fields ]');
  console.log(missing.length ? missing.join(', ') : 'None');
  console.log('\n[ Guidebook Compliance ]');
  console.log('OK:', gcomp.ok);
  console.log('Issues:', (gcomp.issues || []).join('; '));
}

if (process.argv[1] && /[\\\/]scripts[\\\/]report\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}

