import type { AssignmentPeriod, IsoDate } from "./periods";
import { assertValidPeriod } from "./periods";

export type DatedAssignment = AssignmentPeriod & {
  id: string;
  vehicleId: string;
};

/**
 * Inclusive overlap per ADR-005.
 * Adjacent (end D, start D+1) does not overlap.
 */
export function periodsOverlap(a: AssignmentPeriod, b: AssignmentPeriod): boolean {
  assertValidPeriod(a);
  assertValidPeriod(b);
  const aEnd = a.validUntil ?? "9999-12-31";
  const bEnd = b.validUntil ?? "9999-12-31";
  return a.validFrom <= bEnd && b.validFrom <= aEnd;
}

export function findOverlappingAssignments(
  candidate: AssignmentPeriod & { vehicleId: string; id?: string },
  existing: DatedAssignment[],
): DatedAssignment[] {
  assertValidPeriod(candidate);
  return existing.filter((row) => {
    if (row.vehicleId !== candidate.vehicleId) {
      return false;
    }
    if (candidate.id !== undefined && row.id === candidate.id) {
      return false;
    }
    return periodsOverlap(candidate, row);
  });
}

export function isEffectiveOn(period: AssignmentPeriod, asOf: IsoDate): boolean {
  assertValidPeriod(period);
  if (!asOf.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("INVALID_AS_OF");
  }
  if (period.validFrom > asOf) {
    return false;
  }
  if (period.validUntil === null) {
    return true;
  }
  return period.validUntil >= asOf;
}
