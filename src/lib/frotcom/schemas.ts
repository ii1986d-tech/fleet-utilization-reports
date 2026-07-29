import { z } from "zod";
import { mockDailyActivitySchema, mockVehicleSchema } from "./types";

export const mockVehiclesFixtureSchema = z.array(mockVehicleSchema);
export const mockDailyActivitiesFixtureSchema = z.array(mockDailyActivitySchema);
