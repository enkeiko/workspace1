/**
 * Naver Place 크롤러 (네트워크/Apollo/스크립트 기반 수집 + 리뷰 수집)
 */
import puppeteer from 'puppeteer';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';
import { exponentialBackoff } from '../utils/retry.js';
import { logger } from '../utils/logger.js';

export class PlaceCrawler {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout ?? 30000,
      headless: config.headless !== false,
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 2000,
      reviewLimit: config.reviewLimit ?? 20,
      headlessNew: config.headlessNew === true || process.env.PPTR_HEADLESS_NEW === '1',
      executablePath: config.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || process.env.EDGE_PATH || '',
      userDataDir: config.userDataDir || './data/cache/puppeteer-profile'
    };
    this.browser = null;
    this.circuitBreaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 60000 });
  }
  async initialize() {
    const launchOptions = {
      headless: this.config.headlessNew ? 'new' : (this.config.headless !== false),
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'],
      userDataDir: this.config.userDataDir,
    };
    if (this.config.executablePath) launchOptions.executablePath = this.config.executablePath;
    this.browser = await puppeteer.launch(launchOptions);
    logger.info('Collector: browser initialized');
  }
  async close() { if (this.browser) { await this.browser.close(); logger.info('Collector: browser closed'); } }

  async crawlPlace(placeId) {
    return this.circuitBreaker.execute(async () => exponentialBackoff(() => this._crawlPlaceInternal(placeId), this.config.retryAttempts, this.config.retryDelay));
  }

  async _crawlPlaceInternal(placeId) {
    const page = await this.browser.newPage();
    try {
      await page.setUserAgent(this.config.userAgent);
      const url = `https://pcmap.place.naver.com/place/${placeId}`;

      // 네트워크 JSON 캡처
      const networkJson = [];
      await page.setRequestInterception(true);
      page.on('request', req => req.continue());
      page.on('response', async res => {
        try {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('application/json')) {
            const body = await res.text();
            if (body && body.trim().startsWith('{')) networkJson.push({ url: res.url(), json: body });
          }
        } catch {}
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });

      // 페이지 정보 및 스크립트 추출
      const info = await page.evaluate(() => ({
        id: window.location.pathname.split('/').pop(),
        title: document.title || '',
        scripts: Array.from(document.querySelectorAll('script[type="application/json"],script')).map(s => s.textContent || '')
      }));

      let name = info.title;
      if (name && name.includes(':')) name = name.split(':')[0];

      const base = {
        id: String(placeId),
        name: name || '',
        address: '',
        phone: '',
        category: '',
        photos: [],
        menu: [],
        reviews: [],
        hours: null,
        description: ''
      };

      const enriched = this._parseFromNetworkAndScripts(networkJson, info.scripts || [], base);

      // 리뷰 추가 수집
      try {
        const reviews = await this._crawlReviews(placeId);
        if (Array.isArray(reviews) && reviews.length) enriched.reviews = reviews.slice(0, this.config.reviewLimit);
      } catch {}

      // 디버그: 네트워크 JSON 일부를 포함(무거움 방지로 상위 20건만)
      try { enriched.debug = { network_samples: (networkJson || []).slice(0, 20).map(n => ({ url: n.url })) }; } catch {}
      return enriched;
    } finally { await page.close(); }
  }

  _safeParse(txt) { try { return JSON.parse(txt); } catch { return null; } }

  _parseFromNetworkAndScripts(networkJson, scripts, base) {
    const out = { ...base };
    const trySet = (obj, pathArr, setter) => {
      try {
        let cur = obj;
        for (const k of pathArr) { if (!cur || typeof cur !== 'object') return; cur = cur[k]; }
        if (cur !== undefined && cur !== null) setter(cur);
      } catch {}
    };
    const candidates = [];
    for (const n of networkJson) { const o = this._safeParse(n.json); if (o) candidates.push(o); }
    for (const s of scripts) { const o = this._safeParse(s); if (o) candidates.push(o); }

    const photoKeys = ['images','photos','photoList'];
    const menuKeys = ['menus','menuList','menu'];
    const reviewKeys = ['reviews','reviewList','visitorReviews'];

    for (const obj of candidates) {
      if (!out.name) trySet(obj, ['name'], v => out.name = String(v));
      if (!out.phone) trySet(obj, ['phone'], v => out.phone = String(v));
      if (!out.category) trySet(obj, ['category','name'], v => out.category = String(v));
      if (!out.address) {
        trySet(obj, ['address','roadAddress'], v => out.address = String(v));
        trySet(obj, ['address','jibunAddress'], v => { if (!out.address) out.address = String(v); });
        trySet(obj, ['location','address'], v => { if (!out.address) out.address = String(v); });
      }
      for (const key of photoKeys) {
        const arr = obj[key]; if (Array.isArray(arr)) {
          for (const ph of arr) {
            const url = ph?.imageUrl || ph?.url || ph?.origin || ph?.thumbnail;
            if (url && typeof url === 'string') out.photos.push({ url, category: ph?.category || 'general', source: 'network' });
          }
        }
      }
      for (const key of menuKeys) {
        const arr = obj[key]; if (Array.isArray(arr)) {
          for (const m of arr) {
            const name = m?.name || m?.menuName; if (!name) continue;
            const price = m?.price || m?.amount || null;
            const description = m?.description || '';
            out.menu.push({ name: String(name), price: typeof price === 'string' ? price : (price ?? null), description: String(description) });
          }
        }
      }
      for (const key of reviewKeys) {
        const arr = obj[key]; if (Array.isArray(arr)) {
          for (const r of arr) {
            const text = r?.text || r?.comment || r?.contents || '';
            const rating = r?.rating || r?.score || 0;
            const date = r?.date || r?.createdAt || r?.regDate || null;
            if (text) out.reviews.push({ text: String(text), rating: Number(rating)||0, date: date ? String(date) : new Date().toISOString() });
          }
        }
      }
    }
    return out;
  }

  async _crawlReviews(placeId) {
    const page = await this.browser.newPage();
    try {
      await page.setUserAgent(this.config.userAgent);
      const url = `https://pcmap.place.naver.com/place/${placeId}/review/visitor?entry=pll`;
      const networkJson = [];
      await page.setRequestInterception(true);
      page.on('request', req => req.continue());
      page.on('response', async res => {
        try {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('application/json')) {
            const body = await res.text();
            if (body && body.trim().startsWith('{')) networkJson.push({ url: res.url(), json: body });
          }
        } catch {}
      });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config.timeout });
      const out = [];
      for (const item of networkJson) {
        const obj = this._safeParse(item.json); if (!obj) continue;
        const keys = ['reviews','reviewList','visitorReviews'];
        for (const key of keys) {
          const arr = obj[key]; if (Array.isArray(arr)) {
            for (const r of arr) {
              const text = r?.text || r?.comment || r?.contents || '';
              const rating = r?.rating || r?.score || 0;
              const date = r?.date || r?.createdAt || r?.regDate || null;
              if (text) out.push({ text: String(text), rating: Number(rating)||0, date: date ? String(date) : new Date().toISOString() });
            }
          }
        }
      }
      return out;
    } finally { await page.close(); }
  }
}
