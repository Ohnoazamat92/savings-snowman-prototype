import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetAudio } from '../src/pet-audio.js';

test('Звук активируется тапом, синхронизируется со снегом и отменяется mute/dispose', async t => {
  const starts = [];
  const gains = [];
  let contexts = 0, stopped = 0, closed = 0, releaseResume;
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = class {
    state = 'suspended';
    currentTime = 10;
    destination = {};
    constructor() { contexts++; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 2 }); }
    createGain() { const node = { gain: {}, connect() {}, disconnect() {} }; gains.push(node.gain); return node; }
    createBufferSource() {
      return { connect(gain) { return gain; }, disconnect() {},
        start(time) { starts.push(time); }, stop() { stopped++; this.onended?.(); } };
    }
    close() { closed++; this.state = 'closed'; return Promise.resolve(); }
  };
  t.after(() => { if (previous) globalThis.AudioContext = previous; else delete globalThis.AudioContext; });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) }));
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const audio = createPetAudio('./');
  assert.equal(contexts, 0, 'Загрузка файлов не включает звук');
  audio.tap();
  assert.equal(contexts, 1, 'Контекст активируется непосредственно в обработчике тапа');
  await settle();
  assert.deepEqual(starts, [10]);
  audio.snow(false);
  await settle();
  assert.ok(starts[1] > 10.65 && starts[1] <= 10.7, 'Звон запланирован к первым снежинкам');
  assert.deepEqual(gains.map(gain => gain.value), [0.32, 0.52], 'У тапа исходная громкость, у снега сохранён текущий уровень');
  audio.setMuted(true);
  assert.equal(stopped, 2, 'Mute останавливает и уже запланированный звук');
  audio.tap();
  audio.snow(false);
  await settle();
  assert.equal(starts.length, 2);
  audio.setMuted(false);
  audio.tap();
  audio.stop();
  await settle();
  assert.equal(starts.length, 2, 'Отменённый тап не звучит после async-подготовки');
  audio.dispose();
  assert.equal(closed, 1);
  audio.tap();
  await settle();
  assert.equal(starts.length, 2);

  // Если браузер ещё разблокирует контекст, отключение звука отменяет продолжение.
  globalThis.AudioContext.prototype.resume = function () {
    return new Promise(resolve => { releaseResume = () => { this.state = 'running'; resolve(); }; });
  };
  const delayed = createPetAudio('./');
  delayed.tap();
  delayed.setMuted(true);
  releaseResume();
  await settle();
  assert.equal(starts.length, 2);
  delayed.dispose();

  globalThis.AudioContext.prototype.resume = function () { this.state = 'running'; return Promise.resolve(); };
  const gestures = createPetAudio('./');
  gestures.prepare();
  await settle();
  assert.equal(starts.length, 2, 'Нажатие только разблокирует аудио, без лишнего звука');
  gestures.grab();
  await settle();
  assert.equal(starts.length, 3, 'Захват звучит без предварительного тапа');
  const beforeRelease = stopped;
  gestures.release();
  await settle();
  assert.equal(starts.length, 4);
  assert.equal(stopped, beforeRelease + 1, 'Отпускание заменяет звук захвата');
  gestures.setMuted(true);
  gestures.prepare(); gestures.grab(); gestures.release();
  await settle();
  assert.equal(starts.length, 4, 'Отключение звука действует на оба новых жеста');
  gestures.setMuted(false);
  gestures.grab(); gestures.stop();
  await settle();
  assert.equal(starts.length, 4, 'Отмена жеста не оставляет отложенный звук');
  gestures.dispose();
});
