import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('игровой шрифт содержит все русские буквы, включая заглавные О и П', () => {
  const font = readFileSync(new URL('../public/assets/sphere-game/SavingPixel.ttf', import.meta.url));
  const word = offset => font.readUInt16BE(offset);
  let cmap;
  for (let at = 12; at < 12 + 16 * word(4); at += 16) {
    if (font.toString('ascii', at, at + 4) === 'cmap') cmap = font.readUInt32BE(at + 8);
  }
  assert.ok(cmap);
  let checked = 0;
  for (let table = 0; table < word(cmap + 2); table++) {
    const record = cmap + 4 + 8 * table;
    const at = cmap + font.readUInt32BE(record + 4);
    if (word(at) !== 4) continue;
    const count = word(at + 6) / 2, ends = at + 14, starts = ends + 2 * count + 2;
    const deltas = starts + 2 * count, ranges = deltas + 2 * count;
    for (const character of 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюяSaving Survivors0123456789') {
      const code = character.codePointAt(0);
      let glyph = 0;
      for (let i = 0; i < count; i++) {
        if (code < word(starts + i * 2) || code > word(ends + i * 2)) continue;
        const delta = font.readInt16BE(deltas + i * 2), range = word(ranges + i * 2);
        const raw = range ? word(ranges + i * 2 + range + 2 * (code - word(starts + i * 2))) : code;
        glyph = range && !raw ? 0 : (raw + delta) & 65535;
        break;
      }
      assert.ok(glyph, `Отсутствует буква ${character} в cmap ${table}`);
    }
    checked++;
  }
  assert.equal(checked, 2, 'проверены Unicode и Windows Unicode cmap');
});
