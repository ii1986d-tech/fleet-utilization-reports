import type { MockDailyActivity, MockVehicle, NormalizedDailyActivity, NormalizedVehicle } from "./types";

export function normalizeVehicle(input: MockVehicle): NormalizedVehicle {
  return {
    externalFrotcomId: input.externalId,
    registrationNumber: input.registrationNumber,
    displayName: input.displayName,
    active: input.active,
  };
}

export function normalizeDailyActivity(input: MockDailyActivity): NormalizedDailyActivity {
  return {
    externalVehicleId: input.externalVehicleId,
    reportDate: input.reportDate,
    distanceKm: input.distanceKm,
    drivingSeconds: input.drivingSeconds,
    startTimeUtc: input.startTimeUtc,
    endTimeUtc: input.endTimeUtc,
    startLocationText: input.startLocationText,
    endLocationText: input.endLocationText,
    actualDriverExternalId: input.actualDriverExternalId,
  };
}
