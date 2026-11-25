import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, chooseUpgrade, DURATION, leaderboard, pauseGame, readRecord, resumeGame, saveRecord, snapshot, step, weekKey } from '../src/sphere-game/game.js';

test('Полный забег: движение, усиления, победа, пауза и сохранение результата', () => {
  const game = createGame('2026-11-23');
  const identical = createGame('2026-11-23');
  for (let i = 0; i < 60; i++) { step(game, 1 / 60, { x: 1, y: 1 }); step(identical, 1 / 60, { x: 1, y: 1 }); }
  assert.deepEqual(game.enemies, identical.enemies);
  assert.deepEqual(game.sparks, identical.sparks);
  assert.ok(Math.abs(Math.hypot(game.player.x, game.player.y) - 155) < 0.001, 'Диагональ не ускоряет движение');
  pauseGame(game);
  const before = JSON.stringify(snapshot(game));
  step(game, 1 / 60, { x: 1, y: 0 });
  assert.equal(JSON.stringify(snapshot(game)), before, 'На паузе не меняются время и состояние');
  resumeGame(game);
  let upgrades = 0;
  for (let frame = 0; frame < 11000; frame++) {
    if (game.status === 'upgrade') {
      const time = game.time;
      step(game, 1 / 60);
      assert.equal(game.time, time, 'Выбор способности останавливает таймер');
      assert.equal(chooseUpgrade(game, 'invalid'), false);
      const id = game.choices.find(x => ['orbit', 'bolt', 'chain'].includes(x)) || game.choices[0];
      assert.ok(chooseUpgrade(game, id)); upgrades++;
    }
    if (game.status !== 'playing') break;
    step(game, 1 / 60, { x: Math.cos(game.time * .65), y: Math.sin(game.time * .65) });
  }
  assert.equal(game.status, 'won');
  assert.equal(game.time, DURATION);
  assert.ok(game.bossSpawned);
  assert.ok(upgrades >= 3);
  assert.ok(game.kills > 50 && game.collected > 50);
  assert.equal(game.score, game.collected * 10 + game.bonus);
  const final = snapshot(game); step(game, 1 / 60); assert.deepEqual(snapshot(game), final);
  const idle = createGame('2026-11-23');
  for (let i = 0; i < 11000 && !['lost', 'won'].includes(idle.status); i++) {
    if (idle.status === 'upgrade') chooseUpgrade(idle, idle.choices[0]);
    step(idle, 1 / 60);
  }
  assert.equal(idle.status, 'lost', 'Столкновения заканчивают забег');
  assert.equal(idle.player.hp, 0);
  const fresh = createGame('2026-11-23');
  assert.equal(fresh.time, 0); assert.equal(fresh.score, 0); assert.equal(fresh.player.hp, 100);
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  assert.equal(readRecord(storage, 'week'), null);
  const record = saveRecord(storage, 'week', game.score, ' Игрок ');
  assert.equal(record.name, 'Игрок');
  assert.equal(saveRecord(storage, 'week', 10, 'Новое имя').score, game.score, 'Лучший результат не затирается');
  assert.equal(readRecord(storage, 'next-week'), null);
  assert.equal(leaderboard(record).filter(r => r.me).length, 1);
  const rows = leaderboard(record); assert.ok(rows.every((r, i) => !i || rows[i - 1].score >= r.score));
  storage.setItem('sphere-record-week', '{broken'); assert.equal(readRecord(storage, 'week'), null);
  storage.setItem('sphere-record-week', JSON.stringify({ name: 'bad', score: -2 })); assert.equal(readRecord(storage, 'week'), null);
  assert.equal(saveRecord(null, 'week', 10, 'name'), null, 'Недоступное хранилище не ломает игру');
  assert.equal(weekKey(new Date('2026-11-22T21:01:00Z')), '2026-11-23', 'Неделя начинается по Москве');
  assert.equal(weekKey(new Date('2026-11-22T20:59:00Z')), '2026-11-16');
});
