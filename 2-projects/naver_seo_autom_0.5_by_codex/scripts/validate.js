import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv2020 from 'ajv/dist/2020.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(brandArg) {
  const brand = brandArg || process.argv[2] || 'sample_brand';
  const base = path.join(__dirname, '..');
  const schema = JSON.parse(await fs.readFile(path.join(base, 'shared', 'schema.json'), 'utf-8'));
  const files = ['collector.json','analysis.json','improved.json'].map(f => path.join(base, 'clients', brand, f));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  let hadError = false;
  for (const f of files) {
    const data = JSON.parse(await fs.readFile(f, 'utf-8'));
    const ok = validate(data);
    if (!ok) {
      hadError = true;
      console.error(`Schema validation failed for ${f}`);
      console.error(validate.errors);
    } else {
      console.log(`OK: ${f}`);
    }
  }
  if (hadError) process.exit(2);
}

if (process.argv[1] && /[\\\/]scripts[\\\/]validate\.js$/i.test(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
