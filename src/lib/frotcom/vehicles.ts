import { mockVehiclesFixtureSchema } from "./schemas";
import { normalizeVehicle } from "./normalize";
import type { NormalizedVehicle } from "./types";
import vehiclesFixture from "./mocks/vehicles.json";

export async function listVehiclesMock(): Promise<NormalizedVehicle[]> {
  const parsed = mockVehiclesFixtureSchema.parse(vehiclesFixture);
  return parsed.map(normalizeVehicle);
}
