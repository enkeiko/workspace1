import { logger } from './logger.js';

export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function exponentialBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastError = err;
      if (attempt === maxAttempts) { logger.error(`All ${maxAttempts} attempts failed:`, err); throw err; }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, err.message);
      await sleep(delay);
    }
  }
  throw lastError;
}

export async function linearRetry(fn, maxAttempts = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastError = err;
      if (attempt === maxAttempts) throw err;
      logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
}

