import { describe, expect, it } from "vitest";
import {
  canManageMasterData,
  canReadReports,
  canReviewTransportOrders,
  canUploadTransportOrders,
} from "@/lib/auth/roles";
import { appError, mapDatabaseError } from "@/lib/assignments/errors";

describe("PACK-002 authorization matrix (helpers)", () => {
  it("admin may manage masters/assignments writes", () => {
    expect(canManageMasterData("admin")).toBe(true);
  });

  it("viewer and manager cannot write masters", () => {
    expect(canManageMasterData("viewer")).toBe(false);
    expect(canManageMasterData("manager")).toBe(false);
  });

  it("authenticated roles may read reports/settings lists", () => {
    expect(canReadReports("viewer")).toBe(true);
    expect(canReadReports("manager")).toBe(true);
    expect(canReadReports("admin")).toBe(true);
  });

  it("PACK-006: admin/manager review; viewer cannot write", () => {
    expect(canReviewTransportOrders("admin")).toBe(true);
    expect(canReviewTransportOrders("manager")).toBe(true);
    expect(canReviewTransportOrders("viewer")).toBe(false);
    expect(canUploadTransportOrders("manager")).toBe(true);
  });
});

describe("PACK-002 API error contracts", () => {
  it("unauthenticated / forbidden / not found statuses", () => {
    expect(appError("UNAUTHENTICATED", "x").httpStatus).toBe(401);
    expect(appError("FORBIDDEN", "x").httpStatus).toBe(403);
    expect(appError("NOT_FOUND", "x").httpStatus).toBe(404);
    expect(appError("VALIDATION_ERROR", "x").httpStatus).toBe(400);
  });

  it("overlap is always 409 ASSIGNMENT_OVERLAP", () => {
    const e = appError("ASSIGNMENT_OVERLAP", "overlap");
    expect(e.httpStatus).toBe(409);
    expect(e.code).toBe("ASSIGNMENT_OVERLAP");
    expect(mapDatabaseError(new Error("23P01 exclusion")).code).toBe("ASSIGNMENT_OVERLAP");
  });
});
