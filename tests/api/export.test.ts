import { describe, expect, it } from "vitest";
import { isAppError } from "@/lib/auth/session";
import { authorizeExport, runExport } from "@/lib/export/export-service";

describe("export API auth matrix", () => {
  it("unauthenticated cannot export (401)", async () => {
    const auth = authorizeExport({
      code: "UNAUTHENTICATED",
      message: "Authentication required.",
      httpStatus: 401,
    });
    expect(isAppError(auth)).toBe(true);
    if (isAppError(auth)) expect(auth.httpStatus).toBe(401);

    const result = await runExport({
      auth,
      format: "pdf",
      filters: {},
      loadBundles: async () => [],
    });
    expect(isAppError(result)).toBe(true);
    if (isAppError(result)) expect(result.httpStatus).toBe(401);
  });

  it("viewer can export (200-equivalent success)", async () => {
    const result = await runExport({
      auth: { userId: "viewer-1", role: "viewer" },
      format: "excel",
      filters: { includeStops: true, includeKmComparison: true },
      loadBundles: async () => [],
    });
    expect(isAppError(result)).toBe(false);
    if (!isAppError(result)) {
      expect(result.contentType).toContain("spreadsheetml");
      expect(result.bytes.length).toBeGreaterThan(0);
    }
  });

  it("admin can export", async () => {
    const result = await runExport({
      auth: { userId: "admin-1", role: "admin" },
      format: "pdf",
      filters: {},
      loadBundles: async () => [],
    });
    expect(isAppError(result)).toBe(false);
    if (!isAppError(result)) {
      expect(result.contentType).toBe("application/pdf");
    }
  });

  it("manager can export", async () => {
    const result = await runExport({
      auth: { userId: "manager-1", role: "manager" },
      format: "excel",
      filters: {},
      loadBundles: async () => [],
    });
    expect(isAppError(result)).toBe(false);
  });
});
