import { describe, expect, it } from "vitest";
import { normalizePeriod } from "@/lib/assignments/periods";
import {
  findOverlappingAssignments,
  periodsOverlap,
} from "@/lib/assignments/overlap";
import { resolveAssignmentAsOf } from "@/lib/assignments/asOf";
import { mapDatabaseError } from "@/lib/assignments/errors";

describe("assignment periods", () => {
  it("rejects valid_until before valid_from", () => {
    expect(() =>
      normalizePeriod({ validFrom: "2026-07-10", validUntil: "2026-07-01" }),
    ).toThrow("INVALID_PERIOD_RANGE");
  });

  it("allows open-ended periods", () => {
    expect(normalizePeriod({ validFrom: "2026-07-01", validUntil: null })).toEqual({
      validFrom: "2026-07-01",
      validUntil: null,
    });
  });
});

describe("overlap ADR-005", () => {
  it("allows adjacent periods", () => {
    expect(
      periodsOverlap(
        { validFrom: "2026-07-01", validUntil: "2026-07-14" },
        { validFrom: "2026-07-15", validUntil: null },
      ),
    ).toBe(false);
  });

  it("rejects intersecting periods", () => {
    expect(
      periodsOverlap(
        { validFrom: "2026-07-01", validUntil: "2026-07-20" },
        { validFrom: "2026-07-15", validUntil: "2026-07-25" },
      ),
    ).toBe(true);
  });

  it("rejects identical periods", () => {
    expect(
      periodsOverlap(
        { validFrom: "2026-07-01", validUntil: "2026-07-31" },
        { validFrom: "2026-07-01", validUntil: "2026-07-31" },
      ),
    ).toBe(true);
  });

  it("open-ended blocks later overlap", () => {
    const existing = [
      {
        id: "a1",
        vehicleId: "v1",
        validFrom: "2026-07-01",
        validUntil: null,
      },
    ];
    const hits = findOverlappingAssignments(
      { vehicleId: "v1", validFrom: "2026-08-01", validUntil: "2026-08-31" },
      existing,
    );
    expect(hits).toHaveLength(1);
  });

  it("excludes self id on correction", () => {
    const existing = [
      {
        id: "a1",
        vehicleId: "v1",
        validFrom: "2026-07-01",
        validUntil: "2026-07-31",
      },
    ];
    expect(
      findOverlappingAssignments(
        {
          id: "a1",
          vehicleId: "v1",
          validFrom: "2026-07-01",
          validUntil: "2026-07-31",
        },
        existing,
      ),
    ).toHaveLength(0);
  });
});

describe("as-of resolution", () => {
  const rows = [
    {
      id: "a1",
      vehicleId: "v1",
      validFrom: "2026-07-01",
      validUntil: "2026-07-14",
    },
    {
      id: "a2",
      vehicleId: "v1",
      validFrom: "2026-07-15",
      validUntil: null,
    },
  ];

  it("resolves historical driver window", () => {
    expect(resolveAssignmentAsOf("v1", "2026-07-10", rows)?.id).toBe("a1");
    expect(resolveAssignmentAsOf("v1", "2026-07-20", rows)?.id).toBe("a2");
  });
});

describe("error mapping", () => {
  it("maps exclusion violations to 409 ASSIGNMENT_OVERLAP", () => {
    const mapped = mapDatabaseError(
      new Error(
        'conflicting key value violates exclusion constraint "vehicle_assignments_vehicle_period_excl"',
      ),
    );
    expect(mapped.code).toBe("ASSIGNMENT_OVERLAP");
    expect(mapped.httpStatus).toBe(409);
  });
});
