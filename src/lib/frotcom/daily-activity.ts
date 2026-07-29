import { mockDailyActivitiesFixtureSchema } from "./schemas";
import { normalizeDailyActivity } from "./normalize";
import type { NormalizedDailyActivity } from "./types";
import dailyActivityFixture from "./mocks/daily-activity.json";

export async function listDailyActivityMock(reportDate?: string): Promise<NormalizedDailyActivity[]> {
  const parsed = mockDailyActivitiesFixtureSchema.parse(dailyActivityFixture);
  const normalized = parsed.map(normalizeDailyActivity);
  if (!reportDate) {
    return normalized;
  }
  return normalized.filter((row) => row.reportDate === reportDate);
}
