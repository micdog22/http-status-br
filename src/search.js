// Busca nos códigos de status: por número, por classe (4xx) ou por palavras, sem diferenciar acentos.
import { CODES, classOf } from './codes.js';

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Peso de cada campo: achar a palavra no nome vale mais do que achar no texto explicativo.
const FIELDS = [['phrase', 10], ['name', 10], ['aliases', 9], ['keywords', 6], ['summary', 3], ['usage', 1], ['causes', 1]];
const indexCache = new WeakMap();

function indexOf(entry) {
  let idx = indexCache.get(entry);
  if (!idx) {
    idx = {
      code: String(entry.code),
      fields: FIELDS.map(([key, weight]) => {
        const value = entry[key];
        return [normalize(Array.isArray(value) ? value.join(' ') : value), weight];
      }),
      exact: new Set([entry.phrase, entry.name, ...(entry.aliases ?? [])].map(normalize)),
    };
    indexCache.set(entry, idx);
  }
  return idx;
}

// Código exato, ou nome oficial, nome em português ou nome antigo idêntico ao pedido.
export function findExact(query, codes = CODES) {
  const q = normalize(query);
  if (!q) return null;
  return codes.find((entry) => String(entry.code) === q || indexOf(entry).exact.has(q)) ?? null;
}

export function searchCodes(query, { cls = null, codes = CODES } = {}) {
  let list = cls ? codes.filter((entry) => classOf(entry.code) === Number(cls)) : codes.slice();
  const tokens = normalize(query).split(' ').filter(Boolean);
  const words = [];
  for (const token of tokens) {
    const classToken = /^([1-5])xx$/.exec(token);
    if (classToken) list = list.filter((entry) => classOf(entry.code) === Number(classToken[1]));
    else words.push(token);
  }
  if (!words.length) return list;
  if (words.length === 1 && /^\d{1,3}$/.test(words[0])) {
    return list.filter((entry) => String(entry.code).startsWith(words[0]));
  }
  const phrase = words.join(' ');
  const scored = [];
  for (const entry of list) {
    const idx = indexOf(entry);
    let score = idx.exact.has(phrase) ? 100 : 0;
    let matchesAll = true;
    for (const word of words) {
      let best = idx.code === word ? 50 : 0;
      for (const [text, weight] of idx.fields) {
        if (weight > best && text.includes(word)) best = weight;
      }
      if (!best) {
        matchesAll = false;
        break;
      }
      score += best;
    }
    if (matchesAll) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.code - b.entry.code);
  return scored.map((item) => item.entry);
}
