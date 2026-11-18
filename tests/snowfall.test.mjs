import assert from 'node:assert/strict';
import test from 'node:test';
import { snowTimeline } from '../src/snowfall-timeline.js';

test('Снег плавно появляется, завершается и сокращается при reduced motion', async () => {
    assert.equal(snowTimeline(0, false).opacity, 0);
    assert.equal(snowTimeline(0.7, false).opacity, 0);
    assert.ok(Math.abs(snowTimeline(0.85, false).opacity - 0.5) < 1e-6);
    assert.equal(snowTimeline(5, false).opacity, 1);
    assert.ok(Math.abs(snowTimeline(9.65, false).opacity - 0.5) < 1e-6);
    assert.equal(snowTimeline(9.99, false).finished, false);
    assert.equal(snowTimeline(10, false).finished, true);
    assert.equal(snowTimeline(10, false).opacity, 0);
    assert.ok(Math.abs(snowTimeline(0.15, true).opacity - 0.5) < 1e-6);
    assert.equal(snowTimeline(0.7, true).opacity, 1);
    assert.equal(snowTimeline(1.59, true).finished, false);
    assert.equal(snowTimeline(1.6, true).finished, true);
    assert.equal(snowTimeline(1.6, true).opacity, 0);
});
