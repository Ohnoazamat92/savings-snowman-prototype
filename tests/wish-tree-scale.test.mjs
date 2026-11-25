import test from 'node:test';
import assert from 'node:assert/strict';
import { demoWishes, BRANCH_COUNT, wishesOnBranch, freePlaces, findFreeBranch, branchPoint } from '../src/wish-tree/tree-scale.js';
import { validWish, readShared, shareUrl } from '../src/wish-tree/wishes.js';

test('10 240 желаний доступны на 640 устойчивых ветках, соседство и ссылка сохраняются', () => {
  assert.equal(demoWishes.length, 10240);
  assert.equal(new Set(demoWishes.map(w => w.id)).size, 10240);
  for (let branch = 0; branch < BRANCH_COUNT; branch++) {
    const wishes = wishesOnBranch(branch, [], null);
    assert.equal(wishes.length, 16);
    assert.equal(freePlaces(branch, [], null).length, 8);
    assert.ok(wishes.every(w => w.branch === branch && validWish(w)));
    assert.ok(branchPoint(branch).every(p => p > 0 && p < 100));
  }
  const mine = {id:'mine-1',name:'Аня',wish:'Увидеть океан',color:'blue',branch:321,slot:16};
  const friend = {...mine,id:'friend-1',slot:17};
  const link = shareUrl(mine,'https://example.org/wish-tree.html');
  assert.deepEqual(readShared(new URL(link).hash),mine);
  const branch = wishesOnBranch(321,[mine,friend],mine);
  assert.equal(branch.length,18);
  assert.equal(branch.find(w=>w.id===mine.id).displaySlot,16);
  assert.equal(branch.find(w=>w.id===friend.id).displaySlot,17);
  assert.deepEqual(wishesOnBranch(321,[mine,friend],null),wishesOnBranch(321,[mine,friend],null));
  const full = Array.from({length:8},(_,i)=>({...mine,id:`mine-${i}`,slot:16+i}));
  assert.equal(findFreeBranch(321,full,null),322);
  assert.equal(validWish({...mine,branch:640}),false);
  assert.equal(validWish({...mine,branch:-1}),false);
  assert.equal(validWish({...mine,branch:2.5}),false);
  assert.equal(wishesOnBranch(0,[{...mine,branch:undefined}],null).length,17);
});
