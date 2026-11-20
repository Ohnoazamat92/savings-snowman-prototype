import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetClips } from '../src/pet-clips.js';

test('Предзагрузка и тап делят один запрос; ошибка допускает повтор; unmount отменяет загрузку', async t => {
  const calls = [];
  let complete;
  t.mock.method(globalThis, 'fetch', (url, options) => {
    calls.push({ url, signal: options.signal });
    return new Promise(resolve => { complete = resolve; });
  });
  const clips = createPetClips('/prototype/');
  const warm = clips.preload('wave');
  const tap = clips.load('wave');
  assert.equal(calls.length, 1, 'Тап использует уже начатую предзагрузку');
  assert.equal(calls[0].url, '/prototype/assets/pet/wave.webp?v=2');
  const blob = new Blob(['clip']);
  complete({ ok: true, blob: async () => blob });
  await warm;
  assert.equal(await tap, blob);
  assert.equal(await clips.load('wave'), blob);
  assert.equal(calls.length, 1, 'Повторный показ использует кэш');

  const failure = clips.preload('idle');
  complete({ ok: false, status: 503 });
  await failure;
  const retry = clips.load('idle');
  assert.equal(calls.length, 3, 'Неудачная предзагрузка не блокирует повторный тап');
  complete({ ok: true, blob: async () => blob });
  await retry;
  clips.dispose();
  assert.equal(calls.every(call => call.signal.aborted), true);
  await assert.rejects(clips.load('wave'), { name: 'AbortError' });
  await clips.preload('held');
  assert.equal(calls.length, 3, 'После unmount новых запросов нет');
});
