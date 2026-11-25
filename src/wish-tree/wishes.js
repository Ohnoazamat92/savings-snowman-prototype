export const colors = [
  { id: 'gold', label: 'Золотой', hex: '#e7b844', filter: 'none' },
  { id: 'pink', label: 'Розовый', hex: '#dc91b3', filter: 'hue-rotate(290deg) saturate(.6)' },
  { id: 'blue', label: 'Голубой', hex: '#86b9df', filter: 'hue-rotate(165deg) saturate(.5)' },
  { id: 'mint', label: 'Мятный', hex: '#84bfac', filter: 'hue-rotate(90deg) saturate(.45)' },
];

export const positions = [
  [49, 26], [41, 34], [57, 38], [34, 44], [47, 46], [65, 49],
  [39, 55], [55, 58], [29, 62], [67, 65], [45, 70], [59, 76],
  [48, 36], [57, 48], [46, 59], [35, 73], [73, 77], [23, 79],
  [53, 83], [40, 83], [61, 67], [36, 64], [57, 30], [29, 70],
];

export const examples = [
  ['Аня', 'Увидеть северное сияние', 'blue'],
  ['Миша', 'Обустроить свою мастерскую', 'gold'],
  ['Даша', 'Поехать в Японию весной', 'pink'],
  ['Саша', 'Купить первый мотоцикл', 'mint'],
  ['Оля', 'Подарить родителям отпуск', 'gold'],
  ['Денис', 'Записать свой первый альбом', 'blue'],
  ['Лена', 'Встретить рассвет у океана', 'pink'],
  ['Максим', 'Завести дома маленький сад', 'mint'],
  ['Катя', 'Переехать в свою квартиру', 'gold'],
  ['Илья', 'Купить телескоп и увидеть Сатурн', 'blue'],
  ['Алиса', 'Открыть уютную кофейню', 'pink'],
  ['Рома', 'Уехать в горы на целый месяц', 'gold'],
].map(([name, wish, color], slot) => ({ id: `demo-${slot}`, name, wish, color, slot }));

export function validWish(value) {
  return value && typeof value.id === 'string' && /^[a-z\d-]{1,64}$/i.test(value.id)
    && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 24
    && typeof value.wish === 'string' && value.wish.trim().length > 0 && value.wish.length <= 80
    && colors.some(c => c.id === value.color)
    && Number.isInteger(value.slot) && value.slot >= 0 && value.slot < positions.length
    && (value.branch === undefined || (Number.isInteger(value.branch) && value.branch >= 0 && value.branch < 640));
}

export function readShared(hash) {
  if (!hash) return null;
  try {
    const encoded = new URLSearchParams(hash.replace(/^#/, '')).get('wish');
    if (!encoded || encoded.length > 3000) return null;
    const wish = JSON.parse(encoded);
    return validWish(wish) ? wish : null;
  } catch { return null; }
}

export function shareUrl(wish, location) {
  const url = new URL(location);
  url.hash = new URLSearchParams({ wish: JSON.stringify(wish) }).toString();
  return url.href;
}

export function readSaved(storage) {
  try {
    const saved = JSON.parse(storage.getItem('wish-tree-v1') || '[]');
    return Array.isArray(saved) ? saved.filter(validWish) : [];
  } catch { return []; }
}

export function arrangeWishes(saved, shared) {
  const occupied = new Set();
  return [...examples, ...(shared ? [shared] : []), ...saved.filter(w => w.id !== shared?.id)].flatMap(wish => {
    const displaySlot = occupied.has(wish.slot) ? positions.findIndex((_, i) => !occupied.has(i)) : wish.slot;
    if (displaySlot < 0) return [];
    occupied.add(displaySlot);
    return [{ ...wish, displaySlot }];
  });
}

export function monthlyAmount(amount, months) {
  return Math.ceil(amount / months);
}
