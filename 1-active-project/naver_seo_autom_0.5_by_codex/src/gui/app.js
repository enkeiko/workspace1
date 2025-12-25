import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { runCollector } from '../collector/index.js';
import { runAnalyzer } from '../analyzer/index.js';
import { runImprover } from '../improver/index.js';
import { runGenerator } from '../generator/index.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const root = path.resolve(__dirname, '../..');

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Static UI
  app.use('/', express.static(path.join(__dirname, 'public')));

  // Serve client outputs statically
  app.use('/clients', express.static(path.join(root, 'clients')));

  // Run pipeline in-process (no child process)
  app.post('/run', async (req, res) => {
    try {
      const { brand, place, name, phone, address, category, mock } = req.body || {};
      const b = String(brand || 'sample_brand');
      // Ensure intake.json
      const fs = await import('fs/promises');
      const intakeDir = path.join(root, 'clients', b);
      await fs.mkdir(intakeDir, { recursive: true });
      const intake = {
        brand: b,
        place_id: String(place || '1265317185'),
        business: { name: name||'매장', phone: phone||'', address: { raw: address||'' }, category: { primary: category||'', subcategories: [] }, web: { website: '', sns: {} }, ops: {} }
      };
      await fs.writeFile(path.join(intakeDir, 'intake.json'), JSON.stringify(intake, null, 2), 'utf-8');

      // Run steps
      await runCollector(b, { mock: mock === true || String(mock) === 'true' });
      await runAnalyzer(b);
      await runImprover(b);
      await runGenerator(b);

      res.json({ ok: true, outputs: `/clients/${b}/outputs/` });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Helpers
  async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
  async function statOrNull(p) { try { return await fs.stat(p); } catch { return null; } }
  async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
  async function copySafe(src, dest) { if (await exists(src)) { await ensureDir(path.dirname(dest)); await fs.copyFile(src, dest); return true; } return false; }
  async function copyDirRecursive(src, dest) {
    if (!(await exists(src))) return false;
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dest, e.name);
      if (e.isDirectory()) await copyDirRecursive(s, d);
      else if (e.isFile()) await fs.copyFile(s, d);
    }
    return true;
  }

  // List L1 executed stores
  app.get('/api/l1/list', async (req, res) => {
    try {
      const clientsDir = path.join(root, 'clients');
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
            collector_path: path.relative(root, collector).replace(/\\/g, '/'),
            collector_mtime: st ? st.mtime.toISOString() : null,
            collector_size: st ? st.size : null,
            has_analysis: analysis,
            has_improved: improved,
            has_outputs: outputs,
          });
        }
      }
      results.sort((a,b) => String(a.brand).localeCompare(String(b.brand)));
      res.json({ ok: true, stores: results });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Archive L1 artifacts (copy/save)
  app.post('/api/l1/archive', async (req, res) => {
    try {
      const { brand, dest } = req.body || {};
      const b = String(brand || '').trim();
      if (!b) return res.status(400).json({ ok: false, error: 'brand is required' });
      const clientDir = path.join(root, 'clients', b);
      if (!(await exists(clientDir))) return res.status(404).json({ ok: false, error: 'brand not found' });
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-');
      const destRoot = dest ? path.resolve(dest) : path.join(clientDir, 'archives');
      const destDir = path.join(destRoot, ts);
      await ensureDir(destDir);
      const files = ['intake.json','collector.json','analysis.json','improved.json'];
      for (const f of files) await copySafe(path.join(clientDir, f), path.join(destDir, f));
      await copyDirRecursive(path.join(clientDir, 'outputs'), path.join(destDir, 'outputs'));
      await copyDirRecursive(path.join(clientDir, 'inputs'), path.join(destDir, 'inputs'));
      res.json({ ok: true, archive: destDir });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return app;
}
