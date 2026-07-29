import { authenticateLive, authenticateMock } from "./auth";
import { listDailyActivityMock } from "./daily-activity";
import { FrotcomNotConfiguredError } from "./errors";
import { listVehiclesMock } from "./vehicles";
import type { NormalizedDailyActivity, NormalizedVehicle } from "./types";

export type FrotcomClientMode = "mock" | "live";

export type FrotcomClient = {
  mode: FrotcomClientMode;
  listVehicles: () => Promise<NormalizedVehicle[]>;
  listDailyActivity: (reportDate?: string) => Promise<NormalizedDailyActivity[]>;
};

/**
 * Factory for the Frotcom port.
 * Default and only supported mode in PACK-001: mock.
 * Live mode throws until DS-001 is resolved — no invented endpoints.
 */
export function createFrotcomClient(mode: FrotcomClientMode = "mock"): FrotcomClient {
  if (mode === "live") {
    return {
      mode,
      async listVehicles() {
        await authenticateLive();
        throw new FrotcomNotConfiguredError();
      },
      async listDailyActivity() {
        await authenticateLive();
        throw new FrotcomNotConfiguredError();
      },
    };
  }

  return {
    mode: "mock",
    async listVehicles() {
      await authenticateMock();
      return listVehiclesMock();
    },
    async listDailyActivity(reportDate?: string) {
      await authenticateMock();
      return listDailyActivityMock(reportDate);
    },
  };
}
