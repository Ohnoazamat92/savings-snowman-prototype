// Параметры PetPhysicsController.swift: подвес 3.5 Гц / 0.75,
// бросок от 220 px/s, максимум 1400 px/s и 1.2 с; отскок 0.18.
export class PetPhysics {
  constructor(x, y) { Object.assign(this, { x, y, vx: 0, vy: 0, angle: 0, spin: 0, phase: 'rest', elapsed: 0 }); }
  clamp(limits) {
    this.x = Math.max(limits.left, Math.min(limits.right, this.x));
    this.y = Math.max(limits.top, Math.min(limits.bottom, this.y));
  }
  grab() { this.phase = 'held'; this.vx = this.vy = 0; this.target = { x: this.x, y: this.y }; }
  release(vx, vy, reduced) {
    const speed = Math.hypot(vx, vy);
    if (reduced || speed < 220) { this.phase = 'rest'; return false; }
    const scale = Math.min(1, 1400 / speed);
    this.vx = vx * scale; this.vy = vy * scale;
    this.phase = 'flying'; this.elapsed = 0;
    return true;
  }
  step(delta, limits, reduced) {
    if (this.phase === 'rest') return;
    if (reduced) { Object.assign(this, this.target); this.angle = 0; this.clamp(limits); return; }
    let remaining = Math.min(delta, 1 / 30);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120);
      remaining -= dt;
      if (this.phase === 'held') {
        const frequency = 2 * Math.PI * 3.5;
        const damping = 2 * 0.75 * frequency + 4;
        this.vx += (frequency ** 2 * (this.target.x - this.x) - damping * this.vx) * dt;
        this.vy += (frequency ** 2 * (this.target.y - this.y) - damping * this.vy) * dt;
      } else {
        this.vx *= Math.exp(-3 * dt); this.vy *= Math.exp(-3 * dt);
        this.elapsed += dt;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.x < limits.left || this.x > limits.right) this.vx *= -0.18;
      if (this.y < limits.top || this.y > limits.bottom) this.vy *= -0.18;
      this.clamp(limits);
      const lag = this.phase === 'held' ? this.target.x - this.x : 0;
      const targetAngle = Math.max(-0.35, Math.min(0.35, lag * 0.008));
      this.spin += (100 * (targetAngle - this.angle) - 10 * this.spin) * dt;
      this.angle += this.spin * dt;
    }
    if (this.phase === 'flying' && (this.elapsed >= 1.2 || (this.elapsed > 0.15 && Math.hypot(this.vx, this.vy) < 35))) this.phase = 'rest';
  }
}
