import { normalizeText, unique } from './text.js';

export class TaxonomyIndex {
  constructor(raw) {
    this.raw = raw || {};
    this.maps = { core: new Map(), region: new Map(), attributes: new Map() };
    this._build();
  }

  _addEntry(facet, canonical, surfaces = []) {
    if (!facet || !canonical) return;
    const canon = normalizeText(canonical);
    const all = unique([canonical, canon, ...surfaces]);
    for (const s of all) {
      const key = normalizeText(s);
      if (!key) continue;
      if (!this.maps[facet].has(key)) this.maps[facet].set(key, canonical);
    }
  }

  _build() {
    const raw = this.raw;
    const visit = (node, hintFacet = null) => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const item of node) visit(item, hintFacet);
        return;
      }
      if (typeof node === 'object') {
        const facet = node.facet || hintFacet;
        if (facet && (node.canonical || node.name)) {
          const canonical = node.canonical || node.name;
          const surfaces = [].concat(node.surface || node.surfaces || node.synonyms || []);
          this._addEntry(facet, canonical, surfaces);
        }
        for (const [k, v] of Object.entries(node)) {
          let nextFacet = hintFacet;
          if (['core', 'region', 'attributes'].includes(k)) nextFacet = k;
          visit(v, nextFacet);
        }
      }
    };
    visit(raw, null);
  }

  lookup(facet, token) {
    const key = normalizeText(token);
    if (!key) return null;
    const m = this.maps[facet].get(key);
    return m || null;
  }
}

