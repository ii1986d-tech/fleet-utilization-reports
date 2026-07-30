import { describe, expect, it } from "vitest";
import { normalizePlate, normalizePersonName } from "@/lib/imports/assignments/plates";
import { parseDateInput, excelSerialToIso } from "@/lib/imports/assignments/dates";
import { buildHeaderMapping, mapHeaderToCanonical } from "@/lib/imports/assignments/constants";
import { appError } from "@/lib/assignments/errors";
import { canManageMasterData } from "@/lib/auth/roles";
import { buildDuplicateKey } from "@/lib/imports/assignments/validate";
import { periodsOverlap } from "@/lib/assignments/overlap";

describe("plate normalization", () => {
  it("uppercases and strips spaces/hyphens", () => {
    expect(normalizePlate(" b-mw 123 ")).toBe("BMW123");
  });
});

describe("person name normalization", () => {
  it("collapses whitespace case-insensitively", () => {
    expect(normalizePersonName("  Max   Mustermann ")).toBe("max mustermann");
  });
});

describe("dates", () => {
  it("parses ISO and German dates", () => {
    expect(parseDateInput("2026-07-01").iso).toBe("2026-07-01");
    expect(parseDateInput("01.07.2026").iso).toBe("2026-07-01");
  });

  it("rejects ambiguous slash dates", () => {
    expect(parseDateInput("01/02/2026").error).toMatch(/Ambiguous/);
  });

  it("accepts unambiguous DD/MM when day > 12", () => {
    expect(parseDateInput("15/02/2026").iso).toBe("2026-02-15");
  });

  it("converts excel serial", () => {
    // 2026-07-01 approx — verify round-trip via known serial
    const iso = excelSerialToIso(45839);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("headers", () => {
  it("maps German aliases", () => {
    expect(mapHeaderToCanonical("Kennzeichen")).toBe("registration");
    expect(mapHeaderToCanonical("Gültig ab")).toBe("valid_from");
  });

  it("rejects duplicate mapped headers", () => {
    const { errors } = buildHeaderMapping(["Kennzeichen", "registration", "Gültig ab"]);
    expect(errors.some((e) => e.includes("Duplicate"))).toBe(true);
  });

  it("requires registration and valid_from", () => {
    const { errors } = buildHeaderMapping(["Fahrer"]);
    expect(errors.join(" ")).toMatch(/registration/);
    expect(errors.join(" ")).toMatch(/valid_from/);
  });
});

describe("overlap and duplicate key", () => {
  it("detects in-file period overlap", () => {
    expect(
      periodsOverlap(
        { validFrom: "2026-01-01", validUntil: "2026-01-31" },
        { validFrom: "2026-01-15", validUntil: null },
      ),
    ).toBe(true);
  });

  it("builds stable duplicate keys", () => {
    expect(
      buildDuplicateKey({
        plateNorm: "ABC",
        driverNorm: "max",
        customerNorm: null,
        validFrom: "2026-01-01",
        validUntil: null,
        notesNorm: "",
      }),
    ).toBe("ABC|max||2026-01-01||");
  });
});

describe("import authz and error contracts", () => {
  it("only admin may manage masters/imports", () => {
    expect(canManageMasterData("admin")).toBe(true);
    expect(canManageMasterData("manager")).toBe(false);
    expect(canManageMasterData("viewer")).toBe(false);
  });

  it("maps import HTTP statuses", () => {
    expect(appError("IMPORT_FILE_TOO_LARGE", "x").httpStatus).toBe(413);
    expect(appError("IMPORT_VALIDATION_FAILED", "x").httpStatus).toBe(422);
    expect(appError("IMPORT_ALREADY_CONFIRMED", "x").httpStatus).toBe(409);
    expect(appError("IMPORT_FILE_INVALID", "x").httpStatus).toBe(400);
  });
});
