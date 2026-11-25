import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, pauseGame, resumeGame, step } from '../src/sphere-game/game.js';
import { createHeroAnimator } from '../src/sphere-game/hero-animation.js';

test('Ходьба не переключается в покой между шагами физики на 60/120/144 Гц', () => {
  for (const hz of [60, 120, 144]) {
    const game = createGame('walk-check'), sample = createHeroAnimator();
    let accumulator = 0;
    sample(game);
    const frames = new Set();
    for (let render = 0; render < hz; render++) {
      accumulator += 1 / hz;
      while (accumulator >= 1 / 60) { step(game, 1 / 60, { x: 1, y: 0 }); accumulator -= 1 / 60; }
      const pose = sample(game);
      if (game.time > 0) assert.equal(pose.row, 1, `${hz} Гц: ходьба вправо не должна мигать idle`);
      frames.add(pose.frame);
    }
    assert.ok(frames.size >= 7, `${hz} Гц: цикл действительно проигрывается`);
    step(game, 1 / 60, { x: -1, y: 0 });
    assert.deepEqual(sample(game), { row: 2, frame: 0 }, 'Поворот начинает правильную строку');
    step(game, 1 / 60, { x: 0, y: -1 });
    assert.equal(sample(game).row, 2, 'Вертикальный шаг сохраняет выбранное направление');
    const frozen = sample(game);
    pauseGame(game); step(game, 1 / 60, { x: 1, y: 0 });
    assert.deepEqual(sample(game), frozen, 'На паузе кадр не меняется');
    resumeGame(game); step(game, 1 / 60, { x: 0, y: 0 });
    assert.deepEqual(sample(game), { row: 0, frame: 0 }, 'Остановка возвращает покой');
    step(game, 1 / 60, { x: 1, y: 0 });
    assert.deepEqual(sample(game, true), { row: 0, frame: 0 }, 'Reduce Motion использует нейтральный кадр');
    assert.deepEqual(sample(createGame('walk-check')), { row: 0, frame: 0 }, 'Новый забег сбрасывает анимацию');
  }
  const game = createGame(), sample = createHeroAnimator();
  sample(game); game.time = .279;
  assert.equal(sample(game).frame, 0);
  game.time = .281; assert.equal(sample(game).frame, 1, 'Покой: исходные 280 мс');
  game.time = .3; game.player.x = 1; sample(game);
  game.time = .419; game.player.x = 2; assert.equal(sample(game).frame, 0);
  game.time = .421; game.player.x = 3; assert.equal(sample(game).frame, 1, 'Ходьба: исходные 120 мс');
});
