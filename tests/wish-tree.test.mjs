import test from 'node:test';
import assert from 'node:assert/strict';
import { validWish, readShared, readSaved, shareUrl, monthlyAmount, arrangeWishes } from '../src/wish-tree/wishes.js';

test('Желание передаётся по ссылке без потери кириллицы; повреждённые данные отклоняются', () => {
  const wish = { id: 'test-1', name: 'Аня', wish: 'Дом у моря & тишина #1', color: 'mint', slot: 12 };
  const url = shareUrl(wish, 'https://example.org/prototype/wish-tree.html');
  assert.deepEqual(readShared(new URL(url).hash), wish);
  assert.equal(new URL(url).pathname, '/prototype/wish-tree.html');
  for (const hash of ['#wish=%7Bbad', '#wish=null', '#wish=[]', '#wish='+ 'x'.repeat(4000)]) assert.equal(readShared(hash), null);
  assert.equal(validWish({ ...wish, slot: -1 }), false);
  assert.equal(validWish({ ...wish, color: 'url(evil)' }), false);
  assert.equal(validWish({ ...wish, wish: ' ' }), false);
  assert.deepEqual(readSaved({ getItem: () => '{bad' }), []);
  assert.deepEqual(readSaved({ getItem: () => JSON.stringify([wish, { slot: 100 }]) }), [wish]);
  assert.deepEqual(readSaved({ getItem: () => { throw new Error('denied'); } }), []);
  assert.equal(monthlyAmount(100000, 12), 8334);
  const arranged = arrangeWishes([wish], { ...wish, id: 'friend-1' });
  assert.equal(arranged.length, 14);
  assert.equal(new Set(arranged.map(w => w.displaySlot)).size, 14);
  assert.equal(arranged.find(w => w.id === 'friend-1').displaySlot, 12);
});
