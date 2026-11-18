import { PetPhysics } from './pet-physics.js';

export function attachPetDrag(dock, button, callbacks) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pointer = null, timer = 0, frame = 0, previous = 0, skipClick = false, placed = false;
  function geometry() {
    const style = getComputedStyle(dock);
    const half = dock.offsetWidth / 2;
    return {
      base: { x: innerWidth - parseFloat(style.right) - half, y: innerHeight - parseFloat(style.bottom) - half },
      limits: { left: half + 12, right: Math.max(half + 12, innerWidth - half - 12),
        top: half + 12, bottom: Math.max(half + 12, innerHeight - half - 12) },
    };
  }
  const initial = geometry().base;
  const body = new PetPhysics(initial.x, initial.y);
  function render() {
    const { base } = geometry();
    dock.style.transform = `translate3d(${body.x - base.x}px,${body.y - base.y}px,0)`;
    button.style.rotate = `${body.angle}rad`;
  }
  function land() {
    cancelAnimationFrame(frame); frame = 0;
    body.phase = 'rest';
    callbacks.land();
  }
  function tick(now) {
    const delta = previous ? (now - previous) / 1000 : 1 / 60;
    previous = now;
    body.step(delta, geometry().limits, reduced.matches);
    render();
    if (body.phase === 'rest') { land(); return; }
    frame = requestAnimationFrame(tick);
  }
  function startLoop() {
    cancelAnimationFrame(frame); previous = 0;
    frame = requestAnimationFrame(tick);
  }
  function grab() {
    if (!pointer || pointer.dragging) return;
    clearTimeout(timer);
    pointer.dragging = true; placed = true;
    body.grab();
    dock.dataset.phase = 'held';
    callbacks.grab();
    startLoop();
  }
  function down(event) {
    if (!event.isPrimary || event.button !== 0 || pointer) return;
    callbacks.press();
    skipClick = false;
    const catching = body.phase === 'flying';
    cancelAnimationFrame(frame);
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY,
      originX: body.x, originY: body.y, dragging: false,
      samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }] };
    button.setPointerCapture(event.pointerId);
    if (catching) grab();
    else timer = setTimeout(grab, 300);
  }
  function move(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.dragging && Math.hypot(dx, dy) >= 8) grab();
    if (!pointer.dragging) return;
    event.preventDefault();
    const { limits } = geometry();
    body.target = {
      x: Math.max(limits.left, Math.min(limits.right, pointer.originX + dx)),
      y: Math.max(limits.top, Math.min(limits.bottom, pointer.originY + dy)),
    };
    pointer.samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp });
    pointer.samples = pointer.samples.filter(sample => event.timeStamp - sample.t <= 100);
    if (reduced.matches) { body.step(0, limits, true); render(); }
  }
  function up(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    clearTimeout(timer);
    const current = pointer;
    pointer = null;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    if (!current.dragging) return;
    skipClick = true;
    callbacks.release();
    const first = current.samples[0], last = current.samples.at(-1);
    const dt = (last.t - first.t) / 1000;
    const fresh = event.timeStamp - last.t < 100 && dt > 0.008;
    const vx = fresh ? (last.x - first.x) / dt : 0;
    const vy = fresh ? (last.y - first.y) / dt : 0;
    if (body.release(vx, vy, reduced.matches)) {
      dock.dataset.phase = 'flying'; startLoop();
    } else land();
  }
  function cancel() {
    clearTimeout(timer); cancelAnimationFrame(frame);
    const id = pointer?.id;
    if (pointer?.dragging) skipClick = true;
    pointer = null;
    if (id !== undefined && button.hasPointerCapture(id)) button.releasePointerCapture(id);
    body.phase = 'rest'; body.angle = body.spin = 0;
    body.clamp(geometry().limits);
    dock.dataset.phase = 'rest'; render(); callbacks.cancel();
  }
  function click(event) {
    if (skipClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); }
    skipClick = false;
  }
  function key(event) {
    const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    if (event.key === 'Escape') { cancel(); return; }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault(); cancel(); placed = true;
    body.x += direction[0] * 32; body.y += direction[1] * 32;
    body.clamp(geometry().limits); render();
  }
  function resize() {
    if (pointer || body.phase !== 'rest') cancel();
    if (!placed) Object.assign(body, geometry().base);
    body.clamp(geometry().limits); render();
  }
  function hidden() { if (document.hidden) cancel(); }
  function lost(event) { if (pointer?.id === event.pointerId) cancel(); }
  const events = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel,
    lostpointercapture: lost, keydown: key, contextmenu: event => event.preventDefault() };
  for (const [name, handler] of Object.entries(events)) button.addEventListener(name, handler);
  button.addEventListener('click', click, true);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', hidden);
  reduced.addEventListener('change', cancel);
  return {
    landingReady() { body.angle = body.spin = 0; dock.dataset.phase = 'landing'; render(); },
    destroy() {
      clearTimeout(timer); cancelAnimationFrame(frame);
      pointer = null;
      for (const [name, handler] of Object.entries(events)) button.removeEventListener(name, handler);
      button.removeEventListener('click', click, true);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
      reduced.removeEventListener('change', cancel);
    },
  };
}
