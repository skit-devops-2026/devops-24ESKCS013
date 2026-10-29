/**
 * Pure Mathematical Calculation Engine for Attendance Intelligence
 * Canonical client implementation matching server/src/services/attendance-calc.service.ts
 *
 * Guaranteed integer formulation eliminating floating-point precision artifacts.
 */

export interface ScenarioProjection {
  projectedAttended: number;
  projectedConducted: number;
  projectedPercentage: number;
  status: 'safe' | 'shortage';
  classesNeeded: number;
  classesSkippable: number;
}

/**
 * Calculates the minimum consecutive classes a student must attend to reach or exceed target threshold.
 * Uses exact integer formulation:
 * needed = ceil((thresholdPercent * C - 100 * A) / (100 - thresholdPercent))
 */
export function calculateClassesNeeded(
  attended: number,
  conducted: number,
  thresholdPercent: number = 75
): number {
  if (thresholdPercent <= 0) return 0;
  if (thresholdPercent >= 100) {
    return attended === conducted ? 0 : Infinity;
  }
  if (conducted === 0) return 0;

  // If already at or above threshold
  if (attended * 100 >= thresholdPercent * conducted) return 0;

  const numerator = thresholdPercent * conducted - 100 * attended;
  const denominator = 100 - thresholdPercent;
  const needed = Math.ceil(numerator / denominator);
  return Math.max(0, needed);
}

/**
 * Calculates the maximum consecutive classes a student may miss while remaining at or above target threshold.
 * Uses exact integer formulation:
 * skippable = floor((100 * A - thresholdPercent * C) / thresholdPercent)
 */
export function calculateSkippableClasses(
  attended: number,
  conducted: number,
  thresholdPercent: number = 75
): number {
  if (thresholdPercent <= 0) return Infinity;
  if (conducted === 0 || attended === 0) return 0;

  // If already below threshold
  if (attended * 100 < thresholdPercent * conducted) return 0;

  const numerator = 100 * attended - thresholdPercent * conducted;
  const skippable = Math.floor(numerator / thresholdPercent);
  return Math.max(0, skippable);
}

/**
 * Simulates future scenarios: what if the student attends +N classes and misses +M classes?
 */
export function simulateScenario(
  attended: number,
  conducted: number,
  additionalAttended: number = 0,
  additionalMissed: number = 0,
  thresholdPercent: number = 75
): ScenarioProjection {
  const projectedAttended = attended + Math.max(0, Math.floor(additionalAttended));
  const projectedConducted =
    conducted +
    Math.max(0, Math.floor(additionalAttended)) +
    Math.max(0, Math.floor(additionalMissed));

  const projectedPercentage =
    projectedConducted > 0
      ? Number(((projectedAttended / projectedConducted) * 100).toFixed(2))
      : 0;

  const status = projectedPercentage >= thresholdPercent ? 'safe' : 'shortage';
  const classesNeeded = calculateClassesNeeded(
    projectedAttended,
    projectedConducted,
    thresholdPercent
  );
  const classesSkippable = calculateSkippableClasses(
    projectedAttended,
    projectedConducted,
    thresholdPercent
  );

  return {
    projectedAttended,
    projectedConducted,
    projectedPercentage,
    status,
    classesNeeded,
    classesSkippable,
  };
}
