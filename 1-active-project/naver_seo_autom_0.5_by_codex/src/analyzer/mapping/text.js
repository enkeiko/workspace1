export function normalizeText(str) {
  if (!str) return '';
  let s = String(str);
  s = s.replace(/<[^>]*>/g, ' ');
  s = s.toLowerCase();
  // keep letters (incl. Korean) and numbers, replace others with space
  s = s.replace(/[^\p{L}\p{N}]+/gu, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

export function tokenize(text) {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

export function unique(arr) {
  return Array.from(new Set(arr));
}

