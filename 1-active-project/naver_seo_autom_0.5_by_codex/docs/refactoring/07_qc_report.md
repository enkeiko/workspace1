# QC Report (v0.5)

## Summary
- End-to-end pipeline (Collector → Analyzer → Improver → Generator) runs successfully in MOCK mode and passes schema validation.
- All required docs and structure exist. Outputs are generated under clients/{brand}/outputs.

## What we tested
- Install without Chromium download (PUPPETEER_SKIP_DOWNLOAD=1)
- Run full pipeline in MOCK: scripts/run-all.js --brand sample_brand --mock
- Validate outputs against shared/schema.json using Ajv 2020
- Verify refactoring docs presence

## Results
- PASS: collector.json, analysis.json, improved.json generation
- PASS: Guidebook.md, Deploy_Checklist.md, audit_report.json generation
- PASS: Schema validation for all outputs
- PASS: Taxonomy normalization to JSON fallback

## Known limitations / Risks
- Real crawling depends on Naver Place DOM/network structure; current crawler includes network hooks but returns minimal fields until selectors/response parsing are finalized
- Taxonomy source file is Markdown-mixed; normalization extracts YAML blocks or key:value pairs. Mapping quality will improve with pure YAML source
- Console may show garbled Korean due to terminal code page; files are saved as UTF-8
- NPM audit shows high severity vulnerabilities from dependencies; unrelated to functional pipeline but should be addressed

## Recommendations
- Implement robust Apollo/network response parsing with defensive selectors and rate limiting
- Harden keyword mapping rules against taxonomy once a clean YAML spec is provided
- Add unit/integration tests for each module and CI pipeline
- Optionally pin a Chromium revision and add stealth settings if real crawl is required

## How to reproduce
- cd naver_seo_autom_0.5_by_codex
- $env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install (PowerShell)
- npm run pipeline:mock
- npm run validate

