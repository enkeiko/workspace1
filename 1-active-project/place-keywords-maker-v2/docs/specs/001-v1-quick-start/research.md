# Research Notes (Phase 0)

- Naver Place crawling in v1 must avoid login and ToS issues. Use mock data files and deterministic transforms.
- Completeness rubric (initial): name, category, phone, address, hours, menu list, photos. Weight evenly in v1; refine by industry later.
- AI analysis: Store prompts in files; mock provider combines store tokens and industry heuristics to produce candidates.
- Metrics: Mock provider computes pseudo volume/competition via hash for deterministic results offline.
- Config: `local.config.yml` for industry weights and toggles (mock/live). No secrets in repo.

