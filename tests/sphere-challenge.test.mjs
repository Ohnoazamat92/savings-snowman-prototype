import assert from 'node:assert/strict';
import test from 'node:test';
import { challengeUrl, readChallenge, shareChallenge, shareIsPrimary } from '../src/sphere-game/challenge.js';
import { createGame, step, chooseUpgrade, snapshot } from '../src/sphere-game/game.js';

const result = { seed: '2026-11-23', name: 'Саша ❄️', score: 1240, time: 179.95 };
const base = 'https://example.com/prototype/sphere-game.html?old=1#challenge=old';
const encode = data => '#challenge=' + Buffer.from(JSON.stringify(data)).toString('base64url');

test('Вызов переносит кириллицу и исходную неделю, повреждённые ссылки отклоняются', () => {
  const url = new URL(challengeUrl(base, result));
  assert.equal(url.pathname, '/prototype/sphere-game.html');
  assert.equal(url.search, '');
  assert.deepEqual(readChallenge(url.hash), { v: 1, ...result, time: 179 });
  assert.equal(readChallenge(new URL(challengeUrl(base, { ...result, name: 'Ты' })).hash).name, 'Игрок');
  const valid = { v: 1, ...result, time: 180 };
  for (const patch of [{ v: 2 }, { seed: '2026-02-30' }, { seed: '2026-11-24' }, { seed: '<script>' }, { name: '' }, { score: -1 }, { score: 100001 }, { score: '1240' }, { time: 181 }, { time: null }]) {
    assert.equal(readChallenge(encode({ ...valid, ...patch })), null);
  }
  for (const hash of ['', '#challenge=broken', '#challenge=%FF', '#challenge=' + 'a'.repeat(2050)]) assert.equal(readChallenge(hash), null);
  assert.throws(() => challengeUrl(base, { ...result, score: NaN }));
  assert.equal(readChallenge(encode({ ...valid, name: 'А\u202eБ\n' })).name, 'АБ');
});

test('Друг и ответный вызов воспроизводят исходный сценарий после смены недели', () => {
  const original = createGame(result.seed);
  const invitation = readChallenge(new URL(challengeUrl(base, result)).hash);
  const friend = createGame(invitation.seed);
  assert.deepEqual(friend.sparks, original.sparks);
  for (let i = 0; i < 3600; i++) {
    for (const game of [original, friend]) {
      if (game.status === 'upgrade') chooseUpgrade(game, game.choices[0]);
      step(game, 1 / 60, { x: Math.cos(game.time), y: Math.sin(game.time) });
    }
  }
  assert.deepEqual(snapshot(friend), snapshot(original));
  assert.deepEqual(friend.enemies, original.enemies);
  const reply = readChallenge(new URL(challengeUrl(base, { ...result, seed: friend.seed, score: friend.score, time: friend.time })).hash);
  assert.equal(reply.seed, original.seed);
  assert.notDeepEqual(createGame('2026-11-30').sparks, original.sparks);
});

test('После раннего поражения главный повтор, после победы или обгона — вызов', () => {
  assert.equal(shareIsPrimary({ status: 'lost', score: 20, time: 10 }, 0, null), false);
  assert.equal(shareIsPrimary({ status: 'lost', score: 500, time: 70 }, 300, null), true);
  assert.equal(shareIsPrimary({ status: 'won', score: 1000, time: 180 }, 2000, null), true);
  assert.equal(shareIsPrimary({ status: 'lost', score: 120, time: 50 }, 200, { score: 100 }), true);
  assert.equal(shareIsPrimary({ status: 'lost', score: 100, time: 50 }, 200, { score: 100 }), false);
});

test('Шеринг: системное меню, отмена без копирования, запасной буфер и ручная ссылка', async () => {
  const data = { title: 'Вызов', text: 'Побьёшь?', url: challengeUrl(base, result) };
  let received, copied;
  assert.equal(await shareChallenge({ share: async value => { received = value; } }, data), 'shared');
  assert.deepEqual(received, data);
  assert.equal(await shareChallenge({ share: async () => { throw { name: 'AbortError' }; }, clipboard: { writeText: async () => { throw new Error('Не должно вызываться'); } } }, data), 'cancelled');
  assert.equal(await shareChallenge({ share: async () => { throw { name: 'NotAllowedError' }; }, clipboard: { writeText: async value => { copied = value; } } }, data), 'copied');
  assert.equal(copied, data.text + '\n' + data.url);
  assert.equal(await shareChallenge({}, data), 'manual');
});
