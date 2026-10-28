import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateClassesNeeded,
  calculateSkippableClasses,
  simulateScenario,
} from './attendance-math.ts';

describe('Client Attendance Math Engine - Mathematical Proof & Invariants', () => {
  it('CSUL501 (Algorithms): 27/38 = 71.05% -> requires exactly 6 consecutive classes for 75%', () => {
    const needed = calculateClassesNeeded(27, 38, 75);
    assert.equal(needed, 6);

    const sim6 = simulateScenario(27, 38, 6, 0, 75);
    assert.equal(sim6.projectedAttended, 33);
    assert.equal(sim6.projectedConducted, 44);
    assert.equal(sim6.projectedPercentage, 75.0);
    assert.equal(sim6.status, 'safe');

    // 5 classes is insufficient
    const sim5 = simulateScenario(27, 38, 5, 0, 75);
    assert.equal(sim5.projectedPercentage, 74.42);
    assert.equal(sim5.status, 'shortage');
  });

  it('CSUL502 (Machine Learning): 28/37 = 75.68% -> 0 safe bunks (missing 1 drops to 73.68%)', () => {
    const skippable = calculateSkippableClasses(28, 37, 75);
    assert.equal(skippable, 0);

    const simMiss1 = simulateScenario(28, 37, 0, 1, 75);
    assert.equal(simMiss1.projectedPercentage, 73.68);
    assert.equal(simMiss1.status, 'shortage');
  });

  it('CSUL504 (Full Stack): 19/24 = 79.17% -> exactly 1 safe bunk', () => {
    const skippable = calculateSkippableClasses(19, 24, 75);
    assert.equal(skippable, 1);

    const sim1 = simulateScenario(19, 24, 0, 1, 75);
    assert.equal(sim1.projectedPercentage, 76.0);
    assert.equal(sim1.status, 'safe');

    const sim2 = simulateScenario(19, 24, 0, 2, 75);
    assert.equal(sim2.projectedPercentage, 73.08);
    assert.equal(sim2.status, 'shortage');
  });

  it('CSUP520 (DAA Lab): 22/26 = 84.62% -> exactly 3 safe bunks', () => {
    const skippable = calculateSkippableClasses(22, 26, 75);
    assert.equal(skippable, 3);

    const sim3 = simulateScenario(22, 26, 0, 3, 75);
    assert.equal(sim3.projectedPercentage, 75.86);
    assert.equal(sim3.status, 'safe');

    const sim4 = simulateScenario(22, 26, 0, 4, 75);
    assert.equal(sim4.projectedPercentage, 73.33);
    assert.equal(sim4.status, 'shortage');
  });

  it('CSUP522 (FSD Lab): 24/26 = 92.31% -> exactly 6 safe bunks', () => {
    const skippable = calculateSkippableClasses(24, 26, 75);
    assert.equal(skippable, 6);

    const sim6 = simulateScenario(24, 26, 0, 6, 75);
    assert.equal(sim6.projectedPercentage, 75.0);
    assert.equal(sim6.status, 'safe');

    const sim7 = simulateScenario(24, 26, 0, 7, 75);
    assert.equal(sim7.projectedPercentage, 72.73);
    assert.equal(sim7.status, 'shortage');
  });

  it('handles edge cases: 0 conducted, exact boundary (75/100), 100% attendance, 0% attendance', () => {
    assert.equal(calculateClassesNeeded(0, 0, 75), 0);
    assert.equal(calculateSkippableClasses(0, 0, 75), 0);

    assert.equal(calculateClassesNeeded(75, 100, 75), 0);
    assert.equal(calculateSkippableClasses(75, 100, 75), 0);

    assert.equal(calculateClassesNeeded(10, 10, 75), 0);
    assert.equal(calculateSkippableClasses(10, 10, 75), 3);

    assert.equal(calculateClassesNeeded(0, 10, 75), 30);
    assert.equal(calculateSkippableClasses(0, 10, 75), 0);
  });
});
