import test from 'node:test';
import assert from 'node:assert/strict';
import { PetPhysics } from '../src/pet-physics.js';

const bounds = { left: 120, right: 1320, top: 120, bottom: 880 };
test('Подвес отстаёт от руки, наклоняется и сходится к точке захвата', () => {
  const body = new PetPhysics(500, 500);
  body.grab(); body.target = { x: 800, y: 400 };
  body.step(1 / 60, bounds, false);
  assert.ok(body.x > 500 && body.x < 800);
  assert.ok(body.angle > 0);
  for (let i = 0; i < 120; i++) body.step(1 / 60, bounds, false);
  assert.ok(Math.abs(body.x - 800) < 0.1);
  assert.ok(Math.abs(body.y - 400) < 0.1);
  assert.equal(body.release(100, 0, false), false);
  const x = body.x;
  body.step(1 / 60, bounds, false);
  assert.equal(body.x, x, 'Медленное отпускание оставляет персонажа на месте');
});
test('Бросок ограничен скоростью, границами и временем; перехват останавливает полёт', () => {
  const body = new PetPhysics(1300, 500);
  assert.equal(body.release(3000, 0, false), true);
  assert.equal(body.vx, 1400);
  for (let i = 0; i < 75; i++) {
    body.step(1 / 60, bounds, false);
    assert.ok(body.x >= bounds.left && body.x <= bounds.right);
  }
  assert.equal(body.phase, 'rest');
  assert.ok(body.x < bounds.right, 'От границы происходит мягкий отскок');
  body.release(500, 200, false); body.grab();
  assert.equal(body.phase, 'held');
  assert.equal(body.vx, 0);
});
test('Reduced motion: прямой перенос без наклона и инерции', () => {
  const body = new PetPhysics(500, 500);
  body.grab(); body.target = { x: 700, y: -100 };
  body.step(0, bounds, true);
  assert.equal(body.x, 700); assert.equal(body.y, bounds.top);
  assert.equal(body.angle, 0);
  assert.equal(body.release(1200, 0, true), false);
});
