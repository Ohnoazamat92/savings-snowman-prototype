export const DURATION = 180;
export const ARENA = 680;
export const UPGRADES = [
  { id: 'orbit', name: 'Орбитальный щит', label: 'ЗАЩИТА', color: '#9de5cc', description: '+1 искра на орбите. Бьёт врагов рядом.' },
  { id: 'bolt', name: 'Звёздный залп', label: 'АТАКА', color: '#ffdf70', description: '+1 снаряд. Атаки быстрее и сильнее.' },
  { id: 'magnet', name: 'Притяжение', label: 'СБОР', color: '#b6c7ff', description: 'Увеличивает радиус сбора искр.' },
  { id: 'chain', name: 'Цепная реакция', label: 'АТАКА', color: '#9cddf6', description: 'Молния бьёт нескольких врагов подряд.' },
  { id: 'cushion', name: 'Подушка', label: 'ЗАЩИТА', color: '#f3b5ce', description: '+30 здоровья. Снижает входящий урон.' },
  { id: 'speed', name: 'Лёгкий шаг', label: 'ДВИЖЕНИЕ', color: '#d5e79e', description: '+12% к скорости движения.' },
];

export function weekKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  const day = new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

export function seeded(seed) {
  let value = 2166136261;
  for (const c of String(seed)) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createGame(seed = weekKey()) {
  const random = seeded(seed);
  const game = {
    seed, random, choiceRandom: seeded(`${seed}-choices`), status: 'playing', time: 0, score: 0,
    player: { x: 0, y: 0, hp: 100, invulnerable: 0, facing: 1 },
    level: 1, xp: 0, nextXp: 6, kills: 0, collected: 0, wave: 1,
    upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, 0])), choices: [],
    enemies: [], sparks: [], shots: [], effects: [], spawnTimer: 0, attackTimer: 0,
    chainTimer: 0, id: 1, bossSpawned: false, bonus: 0,
  };
  for (let i = 0; i < 18; i++) {
    const angle = random() * Math.PI * 2, radius = 45 + random() * 210;
    game.sparks.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, value: 1 });
  }
  return game;
}

function offerUpgrades(game) {
  // Отдельный генератор: выбор сборки не меняет последовательность волн.
  const pool = UPGRADES.filter(u => game.upgrades[u.id] < 5).map(u => u.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(game.choiceRandom() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  game.choices = pool.slice(0, 3);
  if (game.choices.length) game.status = 'upgrade';
}

export function chooseUpgrade(game, id) {
  if (game.status !== 'upgrade' || !game.choices.includes(id)) return false;
  game.upgrades[id]++;
  if (id === 'cushion') game.player.hp = Math.min(100, game.player.hp + 30);
  game.choices = [];
  game.status = 'playing';
  return true;
}

export function pauseGame(game) { if (game.status === 'playing') game.status = 'paused'; }
export function resumeGame(game) { if (game.status === 'paused') game.status = 'playing'; }

function spawn(game, boss = false) {
  const angle = game.random() * Math.PI * 2;
  const kind = boss ? 3 : game.random() < 0.17 + game.time / 1000 ? 1 : game.random() < 0.16 ? 2 : 0;
  const radius = boss ? 320 : 370 + game.random() * 80;
  let x = game.player.x + Math.cos(angle) * radius, y = game.player.y + Math.sin(angle) * radius;
  const distance = Math.hypot(x, y);
  if (distance > ARENA) { x *= ARENA / distance; y *= ARENA / distance; }
  const hp = boss ? 70 : [1.8, 1.2, 4][kind] + Math.floor(game.time / 60) * 0.6;
  game.enemies.push({ id: game.id++, x, y, kind, hp, maxHp: hp, radius: boss ? 31 : kind === 2 ? 19 : 13, speed: boss ? 43 : [40, 70, 26][kind] + game.time * 0.1, hit: 0, orbitCooldown: 0 });
}

function damage(game, enemy, amount) {
  if (enemy.hp <= 0) return;
  enemy.hp -= amount;
  enemy.hit = 0.1;
  if (enemy.hp <= 0) {
    game.kills++;
    game.sparks.push({ x: enemy.x, y: enemy.y, value: enemy.kind === 3 ? 25 : enemy.kind === 2 ? 3 : 1 });
    game.effects.push({ kind: 'pop', x: enemy.x, y: enemy.y, life: 0.35, total: 0.35 });
  }
}

export function step(game, dt, input = { x: 0, y: 0 }) {
  if (game.status !== 'playing') return;
  dt = Math.min(Math.max(dt, 0), 1 / 30);
  const p = game.player, u = game.upgrades;
  game.time = Math.min(DURATION, game.time + dt);
  game.wave = Math.min(6, 1 + Math.floor(game.time / 30));
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  const magnitude = Math.max(1, Math.hypot(input.x, input.y));
  const speed = 155 * (1 + u.speed * 0.12);
  p.x += input.x / magnitude * speed * dt;
  p.y += input.y / magnitude * speed * dt;
  if (input.x) p.facing = input.x > 0 ? 1 : -1;
  const distance = Math.hypot(p.x, p.y);
  if (distance > ARENA - 24) { p.x *= (ARENA - 24) / distance; p.y *= (ARENA - 24) / distance; }

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer += Math.max(0.16, 0.9 - game.time * 0.004);
    // ponytail: максимум 120 противников; для более плотных волн нужен spatial grid.
    if (game.enemies.length < 120) spawn(game);
  }
  if (game.time >= 150 && !game.bossSpawned) { spawn(game, true); game.bossSpawned = true; }

  game.attackTimer -= dt;
  if (game.attackTimer <= 0) {
    const nearby = game.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 300)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (nearby.length) {
      game.attackTimer = 0.48 / (1 + u.bolt * 0.18);
      for (let i = 0; i < 1 + u.bolt; i++) {
        const target = nearby[i % nearby.length];
        const a = Math.atan2(target.y - p.y, target.x - p.x);
        game.shots.push({ x: p.x, y: p.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, life: 0.9, damage: 1.2 + u.bolt * 0.22 });
      }
    }
  }

  for (const shot of game.shots) {
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    for (const e of game.enemies) {
      if (e.hp > 0 && Math.hypot(shot.x - e.x, shot.y - e.y) < e.radius + 7) {
        damage(game, e, shot.damage); shot.life = 0; break;
      }
    }
  }
  game.shots = game.shots.filter(s => s.life > 0);
  game.chainTimer -= dt;
  if (u.chain && game.chainTimer <= 0) {
    game.chainTimer = Math.max(0.9, 2.5 - u.chain * 0.2);
    let from = p;
    const targets = new Set();
    for (let i = 0; i < u.chain + 1; i++) {
      const target = game.enemies.filter(e => e.hp > 0 && !targets.has(e.id) && Math.hypot(e.x - from.x, e.y - from.y) < 210)
        .sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
      if (!target) break;
      game.effects.push({ kind: 'chain', x: from.x, y: from.y, tx: target.x, ty: target.y, life: 0.2, total: 0.2 });
      damage(game, target, 2 + u.chain * 0.6);
      targets.add(target.id); from = target;
    }
  }

  for (const e of game.enemies) {
    if (e.hp <= 0) continue;
    e.hit = Math.max(0, e.hit - dt); e.orbitCooldown -= dt;
    const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
    e.x += (p.x - e.x) / d * e.speed * dt; e.y += (p.y - e.y) / d * e.speed * dt;
    for (let i = 0; i < u.orbit; i++) {
      const angle = game.time * 2.4 + i * Math.PI * 2 / u.orbit;
      if (e.orbitCooldown <= 0 && Math.hypot(e.x - p.x - Math.cos(angle) * 70, e.y - p.y - Math.sin(angle) * 70) < e.radius + 13) {
        damage(game, e, 2 + u.orbit * 0.6); e.orbitCooldown = 0.4;
      }
    }
    if (e.hp > 0 && d < e.radius + 16 && p.invulnerable === 0) {
      p.hp = Math.max(0, p.hp - Math.max(5, (e.kind === 3 ? 24 : 14) - u.cushion * 2));
      p.invulnerable = 0.8;
      e.x -= (p.x - e.x) / d * 38; e.y -= (p.y - e.y) / d * 38;
      game.effects.push({ kind: 'hurt', x: p.x, y: p.y, life: 0.3, total: 0.3 });
    }
  }
  game.enemies = game.enemies.filter(e => e.hp > 0);
  const magnetRadius = 58 + u.magnet * 34;
  game.sparks = game.sparks.filter(s => {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < 23) { game.xp += s.value; game.collected += s.value; game.score += s.value * 10; return false; }
    if (d < magnetRadius) {
      const speed = Math.min(d, (190 + (magnetRadius - d) * 3) * dt);
      s.x += (p.x - s.x) / d * speed; s.y += (p.y - s.y) / d * speed;
    }
    return true;
  });
  game.effects = game.effects.filter(e => (e.life -= dt) > 0);
  if (p.hp <= 0) { game.status = 'lost'; return; }
  if (game.time >= DURATION) {
    game.bonus = 500 + Math.ceil(p.hp) * 5; game.score += game.bonus; game.status = 'won'; return;
  }
  if (game.xp >= game.nextXp) {
    game.xp -= game.nextXp; game.level++; game.nextXp = Math.ceil(game.nextXp * 1.25 + 2);
    offerUpgrades(game);
  }
}

export function snapshot(game) {
  return { status: game.status, time: game.time, score: game.score, hp: Math.ceil(game.player.hp), level: game.level,
    xp: game.xp, nextXp: game.nextXp, wave: game.wave, upgrades: { ...game.upgrades }, choices: [...game.choices],
    collected: game.collected, kills: game.kills, bonus: game.bonus };
}

const DEMO_ROWS = [
  ['Лунный кот', 3780], ['Тихий космос', 3420], ['Жёлтый шарф', 2960],
  ['Комета', 2540], ['Ловец искр', 2120], ['Орбита', 1650], ['Маленький принц', 1080],
];
export function readRecord(storage, week) {
  try {
    const data = JSON.parse(storage.getItem(`sphere-record-${week}`));
    return data && typeof data.name === 'string' && Number.isInteger(data.score) && data.score >= 0 && data.score <= 100000
      ? { name: data.name.slice(0, 20), score: data.score } : null;
  } catch { return null; }
}
export function saveRecord(storage, week, score, name) {
  const record = { name: (name || 'Ты').trim().slice(0, 20) || 'Ты', score: Math.max(score, readRecord(storage, week)?.score || 0) };
  try { storage.setItem(`sphere-record-${week}`, JSON.stringify(record)); return record; } catch { return null; }
}
export function leaderboard(record) {
  const rows = DEMO_ROWS.map(([name, score]) => ({ name, score, demo: true }));
  if (record) rows.push({ ...record, me: true });
  return rows.sort((a, b) => b.score - a.score).map((r, index) => ({ ...r, rank: index + 1 }));
}
