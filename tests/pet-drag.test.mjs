import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPetDrag } from '../src/pet-drag.js';

test('Тап не звучит как захват; drag отпускается один раз; отмена без «пух»', t => {
  let drag;
  t.after(() => drag?.destroy());
  const globals = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ right: '16', bottom: '12' }), innerWidth: 1440, innerHeight: 1000,
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    window: new EventTarget(), document: new EventTarget() };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }
  const handlers = {}, calls = [];
  const button = { style: {}, addEventListener: (name, fn) => { handlers[name] = fn; },
    removeEventListener() {}, setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  const dock = { offsetWidth: 240, style: {}, dataset: {} };
  drag = attachPetDrag(dock, button, Object.fromEntries(['press','grab','release','land','cancel'].map(name => [name, () => calls.push(name)])));
  const event = (x, timeStamp) => ({ isPrimary: true, button: 0, pointerId: 1, clientX: x, clientY: 800, timeStamp, preventDefault() {} });
  handlers.pointerdown(event(1200, 0)); handlers.pointerup(event(1200, 20));
  assert.deepEqual(calls, ['press']);
  calls.length = 0;
  handlers.pointerdown(event(1200, 30)); handlers.pointermove(event(1250, 60));
  handlers.pointerup(event(1250, 200)); handlers.pointerup(event(1250, 201));
  assert.deepEqual(calls, ['press','grab','release','land']);
  let suppressed = false;
  handlers.click({ detail: 1, preventDefault() {}, stopImmediatePropagation() { suppressed = true; } });
  assert.equal(suppressed, true, 'После отпускания не возникает звук тапа');
  calls.length = 0;
  handlers.pointerdown(event(1200, 300)); handlers.pointermove(event(1250, 330)); handlers.pointercancel();
  assert.deepEqual(calls, ['press','grab','cancel']);
});
