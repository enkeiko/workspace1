import { normalizeText, tokenize, unique } from './text.js';

export class KeywordMapper {
  constructor(taxIndex) {
    this.t = taxIndex;
  }

  map(intake, collected) {
    const details = [];
    const core = this._mapCore(intake, collected, details);
    const region = this._mapRegion(intake, collected, details);
    const attributes = this._mapAttributes(intake, collected, details);
    return { core: unique(core), region: unique(region), attributes: unique(attributes), details };
  }

  _evidence(rule, source, text) {
    return { rule, source, text };
  }

  _mapCore(intake, collected, details) {
    const out = [];
    const sources = [];
    const bc = collected?.client?.business?.category?.primary || collected?.keywords?.core?.[0] || '';
    const bi = intake?.business?.category?.primary || '';
    if (bc) sources.push({ v: bc, src: 'collected.category' });
    if (bi) sources.push({ v: bi, src: 'intake.category' });
    for (const s of sources) {
      const norm = normalizeText(s.v);
      if (!norm) continue;
      const looked = this.t.lookup('core', norm);
      if (looked) {
        out.push(looked);
        details.push({ facet: 'core', canonical: looked, confidence: 'high', evidence: this._evidence('exact-taxonomy', s.src, s.v) });
      } else {
        out.push(s.v);
        details.push({ facet: 'core', canonical: s.v, confidence: 'medium', evidence: this._evidence('fallback-category', s.src, s.v) });
      }
    }
    return out;
  }

  _mapRegion(intake, collected, details) {
    const out = [];
    const raw = intake?.business?.address?.raw || collected?.client?.business?.address?.raw || collected?.address || '';
    const toks = tokenize(raw).slice(0, 5);
    for (const tk of toks) {
      const looked = this.t.lookup('region', tk);
      if (looked) {
        out.push(looked);
        details.push({ facet: 'region', canonical: looked, confidence: 'high', evidence: this._evidence('exact-taxonomy', 'address.raw', tk) });
      } else {
        out.push(tk);
        details.push({ facet: 'region', canonical: tk, confidence: 'medium', evidence: this._evidence('token-address', 'address.raw', tk) });
      }
    }
    return out;
  }

  _mapAttributes(intake, collected, details) {
    const out = [];
    const menus = collected?.assets?.menus || collected?.menu || [];
    const desc = collected?.description || '';
    const items = [];
    for (const m of menus) if (m?.name) items.push(m.name);
    if (desc) items.push(desc);
    for (const it of items) {
      const toks = tokenize(it).slice(0, 6);
      for (const tk of toks) {
        const looked = this.t.lookup('attributes', tk);
        if (looked) {
          out.push(looked);
          details.push({ facet: 'attributes', canonical: looked, confidence: 'high', evidence: this._evidence('exact-taxonomy', 'menu/desc', tk) });
        }
      }
    }
    return out;
  }
}

