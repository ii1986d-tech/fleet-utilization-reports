import type { DatedAssignment } from "./overlap";
import { isEffectiveOn } from "./overlap";
import type { IsoDate } from "./periods";

export function resolveAssignmentAsOf(
  vehicleId: string,
  asOf: IsoDate,
  rows: DatedAssignment[],
): DatedAssignment | null {
  const matches = rows.filter(
    (row) => row.vehicleId === vehicleId && isEffectiveOn(row, asOf),
  );
  if (matches.length === 0) {
    return null;
  }
  if (matches.length > 1) {
    throw new Error("ASSIGNMENT_DATA_CORRUPTION");
  }
  return matches[0]!;
}
