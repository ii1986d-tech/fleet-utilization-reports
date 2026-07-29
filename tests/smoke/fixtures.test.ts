import { describe, expect, it } from "vitest";
import { canManageMasterData, canReadReports, isAppRole, parseRoleFromAppMetadata } from "@/lib/auth/roles";
import { createFrotcomClient } from "@/lib/frotcom/client";
import { FrotcomNotConfiguredError } from "@/lib/frotcom/errors";
import { mockVehiclesFixtureSchema } from "@/lib/frotcom/schemas";
import vehiclesFixture from "@/lib/frotcom/mocks/vehicles.json";

describe("PACK-001 smoke fixtures", () => {
  it("loads and validates mock vehicle fixtures", () => {
    const parsed = mockVehiclesFixtureSchema.parse(vehiclesFixture);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]?.externalId).toMatch(/^MOCK-/);
  });

  it("returns normalized vehicles from mock Frotcom client", async () => {
    const client = createFrotcomClient("mock");
    const vehicles = await client.listVehicles();
    expect(client.mode).toBe("mock");
    expect(vehicles.some((v) => v.registrationNumber === "B-1234-AB")).toBe(true);
  });

  it("filters mock daily activity by report date", async () => {
    const client = createFrotcomClient("mock");
    const rows = await client.listDailyActivity("2026-07-28");
    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.reportDate === "2026-07-28")).toBe(true);
  });

  it("rejects live Frotcom mode until DS-001", async () => {
    const client = createFrotcomClient("live");
    await expect(client.listVehicles()).rejects.toBeInstanceOf(FrotcomNotConfiguredError);
  });
});

describe("role helpers", () => {
  it("parses app_metadata.role", () => {
    expect(parseRoleFromAppMetadata({ role: "admin" })).toBe("admin");
    expect(parseRoleFromAppMetadata({ role: "nope" })).toBeNull();
    expect(isAppRole("viewer")).toBe(true);
    expect(canManageMasterData("admin")).toBe(true);
    expect(canManageMasterData("manager")).toBe(false);
    expect(canReadReports("viewer")).toBe(true);
  });
});
