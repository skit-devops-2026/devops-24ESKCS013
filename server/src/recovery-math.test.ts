import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  calculateClassesNeeded,
  calculateSkippableClasses,
  simulateScenario,
  calculateAttendance,
} from './services/attendance-calc.service.js';

describe('Attendance Recovery Math Engine - Pure Unit Tests', () => {
  /* -------------------------------------------------------------
   * 1. FORMULA & INVARIANT TESTS
   * ------------------------------------------------------------- */
  describe('Mathematical Invariant Verification', () => {
    it('invariant for shortages: (needed - 1) is strictly < threshold, (needed) is >= threshold', () => {
      // Test across various conducted (1 to 80) and attended counts
      const testCases = [
        { attended: 27, conducted: 38, threshold: 75 }, // CSUL501
        { attended: 10, conducted: 20, threshold: 75 }, // 50%
        { attended: 70, conducted: 100, threshold: 75 }, // 70%
        { attended: 15, conducted: 25, threshold: 80 }, // 60% with 80% threshold
        { attended: 1, conducted: 5, threshold: 75 },   // 20%
        { attended: 58, conducted: 80, threshold: 75 }, // 72.5%
      ];

      for (const tc of testCases) {
        const needed = calculateClassesNeeded(tc.attended, tc.conducted, tc.threshold);
        assert.ok(needed > 0, `Expected needed > 0 for shortage tc: ${JSON.stringify(tc)}`);

        // With (needed - 1) attended, percentage must still be strictly below threshold
        if (needed > 1) {
          const underAttended = tc.attended + (needed - 1);
          const underConducted = tc.conducted + (needed - 1);
          const underPct = (underAttended / underConducted) * 100;
          assert.ok(
            underPct < tc.threshold,
            `Expected ${underAttended}/${underConducted} (${underPct}%) < ${tc.threshold}%`
          );
        }

        // With exact (needed) attended, percentage must meet or exceed threshold
        const recoveredAttended = tc.attended + needed;
        const recoveredConducted = tc.conducted + needed;
        const recoveredPct = (recoveredAttended / recoveredConducted) * 100;
        assert.ok(
          recoveredPct >= tc.threshold,
          `Expected ${recoveredAttended}/${recoveredConducted} (${recoveredPct}%) >= ${tc.threshold}%`
        );
      }
    });

    it('invariant for surplus: missing (skippable) classes stays >= threshold, missing (skippable + 1) drops < threshold', () => {
      const testCases = [
        { attended: 19, conducted: 24, threshold: 75 }, // CSUL504 (79.17%)
        { attended: 22, conducted: 26, threshold: 75 }, // CSUP520 (84.62%)
        { attended: 30, conducted: 33, threshold: 75 }, // 90.91%
        { attended: 10, conducted: 10, threshold: 75 }, // 100%
        { attended: 85, conducted: 100, threshold: 80 }, // 85% with 80% threshold
      ];

      for (const tc of testCases) {
        const skippable = calculateSkippableClasses(tc.attended, tc.conducted, tc.threshold);

        // Missing exactly skippable classes stays >= threshold
        const safeConducted = tc.conducted + skippable;
        const safePct = (tc.attended / safeConducted) * 100;
        assert.ok(
          safePct >= tc.threshold,
          `Expected ${tc.attended}/${safeConducted} (${safePct}%) >= ${tc.threshold}% for ${JSON.stringify(tc)}`
        );

        // Missing (skippable + 1) classes strictly violates threshold
        const breachConducted = tc.conducted + skippable + 1;
        const breachPct = (tc.attended / breachConducted) * 100;
        assert.ok(
          breachPct < tc.threshold,
          `Expected ${tc.attended}/${breachConducted} (${breachPct}%) < ${tc.threshold}% for ${JSON.stringify(tc)}`
        );
      }
    });
  });

  /* -------------------------------------------------------------
   * 2. REAL UNIVERSITY ERP COURSE FIXTURES
   * ------------------------------------------------------------- */
  describe('Real University ERP Course Calculations', () => {
    it('CSUL501 (Algorithms): 27/38 = 71.05% -> requires exactly 6 consecutive classes', () => {
      const calc = calculateAttendance(
        { present: 26, od: 1, makeup: 0, absent: 11 },
        'standard_od',
        71.05
      );
      assert.equal(calc.attended, 27);
      assert.equal(calc.conducted, 38);
      assert.equal(calc.percentage, 71.05);

      const needed = calculateClassesNeeded(calc.attended, calc.conducted, 75);
      assert.equal(needed, 6);

      // Simulation check
      const sim = simulateScenario(calc.attended, calc.conducted, 6, 0, 75);
      assert.equal(sim.projectedAttended, 33);
      assert.equal(sim.projectedConducted, 44);
      assert.equal(sim.projectedPercentage, 75.0);
      assert.equal(sim.status, 'safe');
    });

    it('CSUL502 (Machine Learning): 28/37 = 75.68% -> 0 safe bunks (missing 1 drops to 73.68%)', () => {
      const calc = calculateAttendance(
        { present: 26, od: 2, makeup: 0, absent: 9 },
        'standard_od',
        75.68
      );
      assert.equal(calc.attended, 28);
      assert.equal(calc.conducted, 37);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 0);

      const simDrop = simulateScenario(calc.attended, calc.conducted, 0, 1, 75);
      assert.equal(simDrop.projectedPercentage, 73.68);
      assert.equal(simDrop.status, 'shortage');
    });

    it('CSUL504 (Full Stack): 19/24 = 79.17% -> exactly 1 safe bunk', () => {
      const calc = calculateAttendance(
        { present: 17, od: 2, makeup: 0, absent: 5 },
        'standard_od',
        79.17
      );
      assert.equal(calc.attended, 19);
      assert.equal(calc.conducted, 24);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 1);

      // 1 bunk: 19/25 = 76.00% (safe)
      const sim1 = simulateScenario(calc.attended, calc.conducted, 0, 1, 75);
      assert.equal(sim1.projectedPercentage, 76.0);
      assert.equal(sim1.status, 'safe');

      // 2 bunks: 19/26 = 73.08% (shortage)
      const sim2 = simulateScenario(calc.attended, calc.conducted, 0, 2, 75);
      assert.equal(sim2.projectedPercentage, 73.08);
      assert.equal(sim2.status, 'shortage');
    });

    it('CSUP520 (DAA Lab): 22/26 = 84.62% -> exactly 3 safe bunks', () => {
      const calc = calculateAttendance(
        { present: 22, od: 0, makeup: 0, absent: 4 },
        'standard_od',
        84.62
      );
      assert.equal(calc.attended, 22);
      assert.equal(calc.conducted, 26);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 3);

      // 3 bunks: 22/29 = 75.86% (safe)
      const sim3 = simulateScenario(calc.attended, calc.conducted, 0, 3, 75);
      assert.equal(sim3.projectedPercentage, 75.86);
      assert.equal(sim3.status, 'safe');

      // 4 bunks: 22/30 = 73.33% (shortage)
      const sim4 = simulateScenario(calc.attended, calc.conducted, 0, 4, 75);
      assert.equal(sim4.projectedPercentage, 73.33);
      assert.equal(sim4.status, 'shortage');
    });

    it('CSUP522 (FSD Lab): 24/26 = 92.31% -> exactly 6 safe bunks', () => {
      const calc = calculateAttendance(
        { present: 18, od: 6, makeup: 0, absent: 2 },
        'standard_od',
        92.31
      );
      assert.equal(calc.attended, 24);
      assert.equal(calc.conducted, 26);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 6);

      // 6 bunks: 24/32 = 75.00% (exact boundary safe)
      const sim6 = simulateScenario(calc.attended, calc.conducted, 0, 6, 75);
      assert.equal(sim6.projectedPercentage, 75.0);
      assert.equal(sim6.status, 'safe');

      // 7 bunks: 24/33 = 72.73% (shortage)
      const sim7 = simulateScenario(calc.attended, calc.conducted, 0, 7, 75);
      assert.equal(sim7.projectedPercentage, 72.73);
      assert.equal(sim7.status, 'shortage');
    });
  });

  /* -------------------------------------------------------------
   * 3. EDGE CASES & BOUNDARIES
   * ------------------------------------------------------------- */
  describe('Edge Cases and Threshold Boundaries', () => {
    it('handles 0 conducted classes gracefully', () => {
      assert.equal(calculateClassesNeeded(0, 0, 75), 0);
      assert.equal(calculateSkippableClasses(0, 0, 75), 0);
    });

    it('handles exact threshold match (e.g. 75/100): needed = 0, skippable = 0', () => {
      assert.equal(calculateClassesNeeded(75, 100, 75), 0);
      assert.equal(calculateSkippableClasses(75, 100, 75), 0);
    });

    it('handles 100% attendance (e.g. 10/10): skippable = 3', () => {
      assert.equal(calculateClassesNeeded(10, 10, 75), 0);
      assert.equal(calculateSkippableClasses(10, 10, 75), 3);
      // 10/13 = 76.92% (safe); 10/14 = 71.43% (shortage)
    });

    it('handles 0% attendance (e.g. 0/10): needed = 30', () => {
      // (75 * 10 - 0) / 25 = 750 / 25 = 30
      assert.equal(calculateClassesNeeded(0, 10, 75), 30);
      assert.equal(calculateSkippableClasses(0, 10, 75), 0);
    });

    it('supports custom thresholds across 60%, 70%, 80%, 85%', () => {
      // Attended: 30, Conducted: 50 -> 60%
      assert.equal(calculateClassesNeeded(30, 50, 60), 0);
      assert.equal(calculateSkippableClasses(30, 50, 60), 0);

      // For 70% threshold: (70*50 - 3000)/30 = (3500 - 3000)/30 = 500/30 = 16.67 -> ceil = 17
      assert.equal(calculateClassesNeeded(30, 50, 70), 17);
      // Verify: 47 / 67 = 70.15% (>= 70%)
      const sim70 = simulateScenario(30, 50, 17, 0, 70);
      assert.ok(sim70.projectedPercentage >= 70);

      // For 80% threshold: (80*50 - 3000)/20 = 1000/20 = 50
      assert.equal(calculateClassesNeeded(30, 50, 80), 50);
      // Verify: 80 / 100 = 80.00%
      const sim80 = simulateScenario(30, 50, 50, 0, 80);
      assert.equal(sim80.projectedPercentage, 80.0);
    });
  });

  /* -------------------------------------------------------------
   * 4. CROSS-BOUNDARY CLIENT / SERVER CONSOLIDATION PARITY TEST
   * ------------------------------------------------------------- */
  describe('Cross-Boundary Client/Server Parity Invariant', () => {
    it('proves client/src/utils/attendance-math.ts and server/src/services/attendance-calc.service.ts produce identical results across 1,000+ permutations', async () => {
      const clientPath = path.resolve(__dirname, '../../client/src/utils/attendance-math.ts');
      const clientMath = await import(pathToFileURL(clientPath).href);

      const thresholds = [60, 65, 70, 75, 80, 85];
      let permutationsChecked = 0;

      for (let conducted = 0; conducted <= 30; conducted += 3) {
        for (let attended = 0; attended <= conducted; attended += 3) {
          for (const thresh of thresholds) {
            // 1. calculateClassesNeeded parity
            const serverNeeded = calculateClassesNeeded(attended, conducted, thresh);
            const clientNeeded = clientMath.calculateClassesNeeded(attended, conducted, thresh);
            assert.equal(
              clientNeeded,
              serverNeeded,
              `calculateClassesNeeded mismatch at attended=${attended}, conducted=${conducted}, thresh=${thresh}`
            );

            // 2. calculateSkippableClasses parity
            const serverSkippable = calculateSkippableClasses(attended, conducted, thresh);
            const clientSkippable = clientMath.calculateSkippableClasses(attended, conducted, thresh);
            assert.equal(
              clientSkippable,
              serverSkippable,
              `calculateSkippableClasses mismatch at attended=${attended}, conducted=${conducted}, thresh=${thresh}`
            );

            // 3. simulateScenario parity
            for (let addAtt = 0; addAtt <= 2; addAtt++) {
              for (let addMiss = 0; addMiss <= 2; addMiss++) {
                const serverSim = simulateScenario(attended, conducted, addAtt, addMiss, thresh);
                const clientSim = clientMath.simulateScenario(attended, conducted, addAtt, addMiss, thresh);
                assert.deepEqual(
                  clientSim,
                  serverSim,
                  `simulateScenario mismatch at att=${attended}, cond=${conducted}, addAtt=${addAtt}, addMiss=${addMiss}, thresh=${thresh}`
                );
                permutationsChecked++;
              }
            }
          }
        }
      }

      assert.ok(permutationsChecked >= 1000, `Expected >= 1000 permutations, verified ${permutationsChecked}`);
    });
  });
});

