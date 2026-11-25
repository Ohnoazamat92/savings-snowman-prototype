import { DURATION } from './game.js';

const cleanName = name => name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 20);

function valid(data) {
  if (!data || data.v !== 1 || typeof data.name !== 'string' || !cleanName(data.name)) return false;
  if (typeof data.seed !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(data.seed)) return false;
  const date = new Date(data.seed + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === data.seed && date.getUTCDay() === 1
    && Number.isInteger(data.score) && data.score >= 0 && data.score <= 100000
    && Number.isInteger(data.time) && data.time >= 0 && data.time <= DURATION;
}

export function readChallenge(hash) {
  try {
    if (hash.length > 2048) return null;
    const encoded = new URLSearchParams(hash.replace(/^#/, '')).get('challenge');
    if (!encoded || !/^[\w-]+$/.test(encoded)) return null;
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return valid(data) ? { v: 1, seed: data.seed, name: cleanName(data.name), score: data.score, time: data.time } : null;
  } catch { return null; }
}

export function challengeUrl(base, { seed, name, score, time }) {
  const data = { v: 1, seed, name: cleanName(name || '') || 'Игрок', score, time: Math.floor(time) };
  if (data.name === 'Ты') data.name = 'Игрок';
  if (!valid(data)) throw new Error('Некорректный результат');
  const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(data))))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const url = new URL(base);
  url.search = '';
  url.hash = 'challenge=' + encoded;
  return url.href;
}

export function shareIsPrimary(result, previousBest, challenge) {
  return result.status === 'won' || (result.time >= 60 && result.score > previousBest)
    || Boolean(challenge && result.score > challenge.score);
}

export async function shareChallenge(navigator, data) {
  if (typeof navigator.share === 'function') {
    try { await navigator.share(data); return 'shared'; }
    catch (error) { if (error.name === 'AbortError') return 'cancelled'; }
  }
  try {
    await navigator.clipboard.writeText(data.text + '\n' + data.url);
    return 'copied';
  } catch { return 'manual'; }
}
