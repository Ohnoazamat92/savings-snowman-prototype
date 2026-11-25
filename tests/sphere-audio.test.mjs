import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGameAudio, createSoundObserver, readAudioSettings, saveAudioSettings } from '../src/sphere-game/audio.js';
import { createGame, step, pauseGame, resumeGame } from '../src/sphere-game/game.js';

test('звук следует событиям игры, не повторяется на render и безопасно останавливается', async () => {
  const game = createGame('audio'), observe = createSoundObserver();
  assert.deepEqual(observe(game), []);
  game.enemies.push({ id: 99, x: 90, y: 0, hp: 20, radius: 13, speed: 0, hit: 0, orbitCooldown: 0 });
  game.sparks.push({ x: 0, y: 0, value: 1 });
  step(game, 1 / 60);
  const events = observe(game);
  assert.ok(events.includes('shot')); assert.ok(events.includes('collect'));
  assert.deepEqual(observe(game), []);
  game.status = 'upgrade'; assert.ok(observe(game).includes('upgrade'));
  assert.deepEqual(observe(game), []);
  game.bossSpawned = true; assert.deepEqual(observe(game), ['boss']);
  assert.deepEqual(observe(createGame('new')), []);

  const oldAudio = globalThis.Audio, oldContext = globalThis.AudioContext;
  const media = [], contexts = [], oscillators = [];
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ gain: param(), connect(target) { return target; }, disconnect() {} });
  globalThis.Audio = class {
    constructor(url) { this.src = url; this.currentTime = 0; this.paused = true; this.plays = 0; media.push(this); }
    play() { this.paused = false; this.plays++; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  };
  globalThis.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = node(); contexts.push(this); }
    resume() { this.state = 'running'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    createGain() { return node(); }
    createOscillator() {
      const oscillator = { ...node(), frequency: param(), start() {}, stop() { this.stopped = true; } };
      oscillators.push(oscillator); return oscillator;
    }
  };
  try {
    const defaults = readAudioSettings(null), errors = [];
    const audio = createGameAudio('/nested/', defaults, error => errors.push(error));
    assert.equal(media[0].src, '/nested/assets/sphere-game/audio/frost-battle-loop.mp3');
    assert.equal(media[0].paused, true); assert.equal(contexts.length, 0, 'до жеста нет контекста и автозапуска');
    const run = createGame('controller'); audio.update(run, false); audio.begin(run);
    assert.equal(media[0].paused, false); assert.equal(media[0].loop, true);
    media[0].currentTime = 18;
    run.status = 'upgrade'; audio.update(run);
    assert.equal(media[0].paused, false, 'при выборе способности музыка продолжается');
    assert.equal(media[0].currentTime, 18);
    audio.update(run, false); assert.equal(media[0].paused, true, 'уход из вкладки останавливает музыку даже при выборе');
    audio.update(run, false); assert.equal(media[0].paused, true);
    audio.update(run, true); assert.equal(media[0].paused, false);
    run.status = 'playing'; audio.update(run);
    audio.effect('collect'); const firstVoices = oscillators.length;
    audio.effect('collect'); assert.equal(oscillators.length, firstVoices, 'защита от звуковой очереди');
    pauseGame(run); audio.update(run);
    assert.equal(media[0].paused, true); assert.ok(oscillators.every(n => n.stopped));
    resumeGame(run); audio.prepare(); audio.update(run);
    assert.equal(media[0].paused, false); assert.equal(media[0].currentTime, 18, 'продолжение с той же позиции');
    for (let i = 0; i < 100; i++) { contexts[0].currentTime += 0.2; audio.effect('won'); }
    assert.ok(oscillators.filter(n => !n.stopped).length <= 24, 'ограничение числа одновременных голосов');
    audio.settings({ ...defaults, muted: true }); assert.equal(media[0].muted, true);
    assert.ok(oscillators.every(n => n.stopped));
    const count = oscillators.length; audio.effect('hurt'); assert.equal(oscillators.length, count);
    audio.settings(defaults); audio.update(run, false); assert.equal(media[0].paused, true);
    audio.begin(createGame('restart')); assert.equal(media[0].currentTime, 0);
    audio.silence(); assert.equal(media[0].paused, true);
    audio.dispose(); audio.prepare(); assert.equal(contexts[0].state, 'closed'); assert.equal(media[0].src, '');
    assert.deepEqual(errors, []);
  } finally { globalThis.Audio = oldAudio; globalThis.AudioContext = oldContext; }

  let saved;
  const storage = { setItem(key, value) { saved = value; }, getItem() { return saved; } };
  saveAudioSettings(storage, { music: 0, effects: 0.3, muted: true });
  assert.deepEqual(readAudioSettings(storage), { music: 0, effects: 0.3, muted: true });
  saved = '{broken'; assert.equal(readAudioSettings(storage).music, 0.45);
  saved = '{"music":5,"effects":-1}'; assert.deepEqual(readAudioSettings(storage), { music: 1, effects: 0, muted: false });
  assert.doesNotThrow(() => saveAudioSettings({ setItem() { throw Error(); } }, {}));
});
