import { z } from "zod";

/** Domain types for the adapter — not a claim of live Frotcom API shape. */
export const mockVehicleSchema = z.object({
  externalId: z.string().min(1),
  registrationNumber: z.string().min(1),
  displayName: z.string().min(1),
  active: z.boolean(),
});

export const mockDailyActivitySchema = z.object({
  externalVehicleId: z.string().min(1),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distanceKm: z.number().nonnegative(),
  drivingSeconds: z.number().int().nonnegative(),
  startTimeUtc: z.string().datetime().nullable(),
  endTimeUtc: z.string().datetime().nullable(),
  startLocationText: z.string().nullable(),
  endLocationText: z.string().nullable(),
  actualDriverExternalId: z.string().nullable(),
});

export type MockVehicle = z.infer<typeof mockVehicleSchema>;
export type MockDailyActivity = z.infer<typeof mockDailyActivitySchema>;

export type NormalizedVehicle = {
  externalFrotcomId: string;
  registrationNumber: string;
  displayName: string;
  active: boolean;
};

export type NormalizedDailyActivity = {
  externalVehicleId: string;
  reportDate: string;
  distanceKm: number;
  drivingSeconds: number;
  startTimeUtc: string | null;
  endTimeUtc: string | null;
  startLocationText: string | null;
  endLocationText: string | null;
  actualDriverExternalId: string | null;
};
