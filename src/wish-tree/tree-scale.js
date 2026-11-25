import { examples } from './wishes.js';

export const BRANCHES_PER_ZONE = 80;
export const DEMOS_PER_BRANCH = 16;
export const zones = [
  { name: 'У звезды', x: 50, y: 29, rx: 5, ry: 7 },
  { name: 'Верхние ветви слева', x: 40, y: 43, rx: 7, ry: 7 },
  { name: 'Верхние ветви справа', x: 58, y: 44, rx: 7, ry: 7 },
  { name: 'Средние ветви слева', x: 34, y: 58, rx: 9, ry: 7 },
  { name: 'Средние ветви справа', x: 64, y: 59, rx: 9, ry: 7 },
  { name: 'Нижние ветви слева', x: 27, y: 77, rx: 10, ry: 7 },
  { name: 'Нижние ветви в центре', x: 49, y: 75, rx: 9, ry: 9 },
  { name: 'Нижние ветви справа', x: 73, y: 78, rx: 10, ry: 7 },
];
export const BRANCH_COUNT = zones.length * BRANCHES_PER_ZONE;
export function wishNoun(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  return mod100 >= 11 && mod100 <= 14 ? 'желаний' : mod10 === 1 ? 'желание' : mod10 >= 2 && mod10 <= 4 ? 'желания' : 'желаний';
}
export const branchPositions = [
  [12, 23], [34, 20], [56, 25], [78, 17],
  [21, 42], [44, 40], [67, 43], [87, 36],
  [11, 62], [33, 62], [56, 62], [78, 59],
  [23, 81], [45, 83], [67, 80], [88, 77],
  [18, 32], [42, 31], [68, 32], [89, 48],
  [19, 72], [43, 72], [66, 71], [88, 89],
];
const extra = [
  {name:'Вера',wish:'Пройти пешком вдоль океана'},
  {name:'Артём',wish:'Обустроить дом для всей семьи'},
  {name:'Полина',wish:'Научиться снимать кино'},
  {name:'Лёша',wish:'Отправиться в большое путешествие'},
];
const people = [...examples, ...extra];
export const demoWishes = Array.from({ length: BRANCH_COUNT * DEMOS_PER_BRANCH }, (_, n) => {
  const branch = Math.floor(n / DEMOS_PER_BRANCH);
  const slot = n % DEMOS_PER_BRANCH;
  return { id: `sample-${branch}-${slot}`, branch, slot, color: ['gold','pink','blue','mint'][(slot + branch) % 4],
    name: people[(slot + branch * 3) % people.length].name,
    wish: people[(slot * 5 + branch * 7) % people.length].wish };
});

export function branchPoint(branch) {
  const zone = zones[Math.floor(branch / BRANCHES_PER_ZONE)];
  const local = branch % BRANCHES_PER_ZONE;
  const radius = Math.sqrt((local + .5) / BRANCHES_PER_ZONE);
  const angle = local * 2.399963229728653;
  return [zone.x + Math.cos(angle) * radius * zone.rx, zone.y + Math.sin(angle) * radius * zone.ry];
}

export function personalWishes(saved, shared) {
  return [...saved.filter(w => w.id !== shared?.id), ...(shared && !shared.id.startsWith('sample-') ? [shared] : [])];
}

export function wishesOnBranch(branch, saved, shared) {
  const occupied = new Set();
  const records = [...demoWishes.slice(branch * DEMOS_PER_BRANCH, (branch + 1) * DEMOS_PER_BRANCH),
    ...personalWishes(saved, shared).filter(w => (w.branch ?? 0) === branch)];
  return records.map(w => {
    let displaySlot = occupied.has(w.slot) ? branchPositions.findIndex((_, i) => !occupied.has(i)) : w.slot;
    if (displaySlot < 0) return { ...w, displaySlot: null };
    occupied.add(displaySlot);
    return { ...w, branch, displaySlot };
  });
}

export function freePlaces(branch, saved, shared) {
  const used = new Set(wishesOnBranch(branch, saved, shared).map(w => w.displaySlot));
  return branchPositions.map((_, i) => i).filter(i => !used.has(i));
}

export function findFreeBranch(from, saved, shared) {
  for (let offset = 0; offset < BRANCH_COUNT; offset++) {
    const branch = (from + offset) % BRANCH_COUNT;
    if (freePlaces(branch, saved, shared).length) return branch;
  }
  return null;
}
