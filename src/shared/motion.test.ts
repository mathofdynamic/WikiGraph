import assert from 'node:assert/strict';
import {
  MOTION_DURATION_MS,
  MOTION_EASING,
  MOTION_TRANSFORM_INITIAL,
  MOTION_TRANSFORM_FINAL,
  TRANSIENT_EXIT_DURATION_MS,
  TRANSIENT_EXIT_EASING,
  TRANSIENT_EXIT_TRANSFORM,
  computeDelays,
} from './motion';

console.log('--- Test Suite: Shared Entrance-Motion System ---');

// Test 1: Tokens verification
{
  assert.equal(MOTION_DURATION_MS, 100, 'Motion duration must be 100ms');
  assert.equal(MOTION_EASING, 'cubic-bezier(0.16, 1, 0.3, 1)', 'Easing must match contract');
  assert.equal(MOTION_TRANSFORM_INITIAL, 'translate3d(0, 20px, 0)', 'Initial transform must be translate3d(0, 20px, 0)');
  assert.equal(MOTION_TRANSFORM_FINAL, 'translate3d(0, 0, 0)', 'Final transform must be translate3d(0, 0, 0)');

  assert.equal(TRANSIENT_EXIT_DURATION_MS, 66, 'Transient exit duration must be 66ms');
  assert.equal(TRANSIENT_EXIT_EASING, 'cubic-bezier(0.4, 0, 1, 1)', 'Transient exit easing must match contract');
  assert.equal(TRANSIENT_EXIT_TRANSFORM, 'translate3d(0, 8px, 0)', 'Transient exit transform must be translate3d(0, 8px, 0)');
  console.log('  ✓ Tokens and easing match contract specifications');
}

// Test 2: computeDelays(count, duration) - basic stagger derived from duration / 3
{
  const delays = computeDelays(4, 100, false);
  assert.equal(delays.length, 4, 'Should return 4 delay values');
  assert.equal(delays[0], 0, 'First item starts at 0ms');
  assert.equal(delays[1], 100 / 3, 'Second item starts at duration / 3');
  assert.equal(delays[2], 200 / 3, 'Third item starts at 2 * duration / 3');
  assert.equal(delays[3], 300 / 3, 'Fourth item starts at 3 * duration / 3 (100ms)');
  console.log('  ✓ Stagger derived from duration / 3 without hardcoding (0, 33.33, 66.67, 100)');
}

// Test 3: computeDelays with custom duration
{
  const delays = computeDelays(3, 150, false);
  assert.equal(delays.length, 3);
  assert.equal(delays[0], 0);
  assert.equal(delays[1], 50); // 150 / 3
  assert.equal(delays[2], 100); // 2 * 150 / 3
  console.log('  ✓ Custom duration 150ms correctly produces 50ms stagger steps');
}

// Test 4: computeDelays when motion is reduced
{
  const delaysReduced = computeDelays(5, 100, true);
  assert.equal(delaysReduced.length, 5);
  for (let i = 0; i < delaysReduced.length; i++) {
    assert.equal(delaysReduced[i], 0, `Item ${i} must have 0ms delay when motion is reduced`);
  }
  console.log('  ✓ Zero delays returned for all items when motion is reduced');
}

// Test 5: computeDelays boundary cases
{
  const empty = computeDelays(0, 100);
  assert.deepEqual(empty, []);
  const negative = computeDelays(-3, 100);
  assert.deepEqual(negative, []);
  console.log('  ✓ Edge cases (0 or negative count) return empty array safely');
}

console.log('========================================');
console.log('All Entrance-Motion Tests Passed Successfully! 🎬');
console.log('========================================');
