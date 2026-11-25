// Тайминги исходного assets/snowman/pixel/final/atlas-manifest.json.
const IDLE = [280, 110, 110, 140, 140, 320];
const WALK = [120, 120, 120, 120, 120, 120, 120, 220];

export function createHeroAnimator() {
  let previousGame, lastTime = 0, lastX = 0, lastY = 0, row = 0, elapsed = 0;
  return function sample(game, reduceMotion = false) {
    const { x, y, facing } = game.player;
    if (game !== previousGame || game.time < lastTime) {
      previousGame = game; lastTime = game.time; lastX = x; lastY = y;
      row = 0; elapsed = 0;
    }
    // Между шагами физики сохраняем позу: rAF может работать на 120/144 Гц.
    if (game.time !== lastTime) {
      const moving = Math.abs(x - lastX) + Math.abs(y - lastY) > 0.01;
      const nextRow = moving ? (facing > 0 ? 1 : 2) : 0;
      elapsed = nextRow === row ? elapsed + (game.time - lastTime) * 1000 : 0;
      row = nextRow; lastTime = game.time; lastX = x; lastY = y;
    }
    if (reduceMotion) return { row: 0, frame: 0 };
    const durations = row === 0 ? IDLE : WALK;
    let phase = elapsed % durations.reduce((sum, duration) => sum + duration, 0);
    let frame = 0;
    while (frame < durations.length - 1 && phase >= durations[frame]) phase -= durations[frame++];
    return { row, frame };
  };
}
