import { normalizePeriod } from "@/lib/assignments/periods";
import {
  findOverlappingAssignments,
  periodsOverlap,
  type DatedAssignment,
} from "@/lib/assignments/overlap";
import type { ValidationStatus } from "./constants";
import { displayPersonName, normalizePersonName, normalizePlate } from "./plates";
import { readDateFromCell, type ParsedWorkbook, type ParsedWorkbookRow } from "./parse";

export type MasterRefs = {
  vehicles: Array<{ id: string; registration_number: string; active: boolean }>;
  drivers: Array<{ id: string; full_name: string; active: boolean }>;
  customers: Array<{ id: string; name: string; active: boolean }>;
  assignments: DatedAssignment[];
};

export type ValidatedImportRow = {
  sourceRowNumber: number;
  validationStatus: ValidationStatus;
  validationErrors: Array<{ code: string; message: string; field?: string }>;
  validationWarnings: Array<{ code: string; message: string; field?: string }>;
  duplicateKey: string | null;
  normalizedPayload: Record<string, unknown>;
  vehicleId: string | null;
  driverId: string | null;
  customerId: string | null;
  needsNewDriver: boolean;
  needsNewCustomer: boolean;
  persistenceStatus: "pending" | "not_attempted";
};

function cellText(row: ParsedWorkbookRow, field: keyof ParsedWorkbookRow["cells"]): string {
  return row.cells[field]?.text?.trim() ?? "";
}

export function buildDuplicateKey(input: {
  plateNorm: string;
  driverNorm: string | null;
  customerNorm: string | null;
  validFrom: string;
  validUntil: string | null;
  notesNorm: string;
}): string {
  return [
    input.plateNorm,
    input.driverNorm ?? "",
    input.customerNorm ?? "",
    input.validFrom,
    input.validUntil ?? "",
    input.notesNorm,
  ].join("|");
}

export function validateParsedWorkbook(
  workbook: ParsedWorkbook,
  masters: MasterRefs,
  options: { createNewMasters: boolean },
): ValidatedImportRow[] {
  const vehicleByPlate = new Map(
    masters.vehicles.map((v) => [normalizePlate(v.registration_number), v]),
  );
  const driverByName = new Map(
    masters.drivers.filter((d) => d.active).map((d) => [normalizePersonName(d.full_name), d]),
  );
  const customerByName = new Map(
    masters.customers.filter((c) => c.active).map((c) => [normalizePersonName(c.name), c]),
  );

  const draft: ValidatedImportRow[] = workbook.rows.map((row) => {
    const errors: ValidatedImportRow["validationErrors"] = [];
    const warnings: ValidatedImportRow["validationWarnings"] = [];

    const regCell = row.cells.registration;
    if (regCell?.hasFormula) {
      errors.push({
        code: "FORMULA_NOT_ALLOWED",
        message: "Formula not allowed in Kennzeichen.",
        field: "registration",
      });
    }
    const plateDisplay = cellText(row, "registration");
    const plateNorm = normalizePlate(plateDisplay);
    if (!plateNorm && !regCell?.hasFormula) {
      errors.push({
        code: "MISSING_REGISTRATION",
        message: "Kennzeichen is required.",
        field: "registration",
      });
    }

    const vehicle = plateNorm ? vehicleByPlate.get(plateNorm) : undefined;
    let vehicleId: string | null = null;
    if (plateNorm) {
      if (!vehicle) {
        errors.push({
          code: "UNKNOWN_VEHICLE",
          message: "Vehicle not found.",
          field: "registration",
        });
      } else if (!vehicle.active) {
        errors.push({
          code: "INACTIVE_VEHICLE",
          message: "Vehicle is inactive.",
          field: "registration",
        });
      } else {
        vehicleId = vehicle.id;
      }
    }

    const fromCell = row.cells.valid_from;
    const fromParsed = readDateFromCell(fromCell);
    if (fromParsed.formulaRejected) {
      errors.push({
        code: "FORMULA_NOT_ALLOWED",
        message: fromParsed.error ?? "Formula not allowed.",
        field: "valid_from",
      });
    } else if (!fromParsed.iso) {
      errors.push({
        code: "INVALID_VALID_FROM",
        message: fromParsed.error ?? "valid_from is required.",
        field: "valid_from",
      });
    }

    const untilCell = row.cells.valid_until;
    let validUntil: string | null = null;
    if (untilCell?.hasFormula) {
      errors.push({
        code: "FORMULA_NOT_ALLOWED",
        message: "Formula not allowed in valid_until.",
        field: "valid_until",
      });
    } else if (untilCell && (untilCell.text.trim() || untilCell.value)) {
      const untilParsed = readDateFromCell(untilCell);
      if (!untilParsed.iso) {
        errors.push({
          code: "INVALID_VALID_UNTIL",
          message: untilParsed.error ?? "Invalid valid_until.",
          field: "valid_until",
        });
      } else {
        validUntil = untilParsed.iso;
      }
    }

    let periodOk = false;
    if (fromParsed.iso && !fromParsed.formulaRejected) {
      try {
        normalizePeriod({ validFrom: fromParsed.iso, validUntil });
        periodOk = true;
      } catch {
        errors.push({
          code: "INVALID_PERIOD",
          message: "valid_until must be on or after valid_from.",
          field: "valid_until",
        });
      }
    }

    const driverRaw = cellText(row, "driver");
    const customerRaw = cellText(row, "customer");
    if (row.cells.driver?.hasFormula) {
      errors.push({
        code: "FORMULA_NOT_ALLOWED",
        message: "Formula not allowed in driver.",
        field: "driver",
      });
    }
    if (row.cells.customer?.hasFormula) {
      errors.push({
        code: "FORMULA_NOT_ALLOWED",
        message: "Formula not allowed in customer.",
        field: "customer",
      });
    }

    let driverId: string | null = null;
    let customerId: string | null = null;
    let needsNewDriver = false;
    let needsNewCustomer = false;

    if (driverRaw && !row.cells.driver?.hasFormula) {
      const key = normalizePersonName(driverRaw);
      const hit = driverByName.get(key);
      const inactive = masters.drivers.find(
        (d) => !d.active && normalizePersonName(d.full_name) === key,
      );
      if (hit) {
        driverId = hit.id;
      } else if (inactive) {
        errors.push({
          code: "INACTIVE_DRIVER",
          message: "Driver is inactive.",
          field: "driver",
        });
      } else {
        needsNewDriver = true;
        if (!options.createNewMasters) {
          errors.push({
            code: "UNKNOWN_DRIVER",
            message: "Unknown driver (create-masters is OFF).",
            field: "driver",
          });
        }
      }
    }

    if (customerRaw && !row.cells.customer?.hasFormula) {
      const key = normalizePersonName(customerRaw);
      const hit = customerByName.get(key);
      const inactive = masters.customers.find(
        (c) => !c.active && normalizePersonName(c.name) === key,
      );
      if (hit) {
        customerId = hit.id;
      } else if (inactive) {
        errors.push({
          code: "INACTIVE_CUSTOMER",
          message: "Customer is inactive.",
          field: "customer",
        });
      } else {
        needsNewCustomer = true;
        if (!options.createNewMasters) {
          errors.push({
            code: "UNKNOWN_CUSTOMER",
            message: "Unknown customer (create-masters is OFF).",
            field: "customer",
          });
        }
      }
    }

    if (!driverRaw && !customerRaw) {
      errors.push({
        code: "MISSING_PARTY",
        message: "At least one of driver or customer is required.",
      });
    }

    let notesDisplay = cellText(row, "notes");
    if (row.cells.notes?.hasFormula) {
      const literal = row.cells.notes.text?.trim() ?? "";
      if (literal) {
        notesDisplay = literal;
        warnings.push({
          code: "FORMULA_REMARK_LITERAL",
          message: "Remark used displayed literal text from formula cell.",
          field: "notes",
        });
      } else {
        notesDisplay = "";
        warnings.push({
          code: "FORMULA_REMARK_EMPTY",
          message: "Remark formula ignored; left empty.",
          field: "notes",
        });
      }
    }
    if (notesDisplay.length > 2000) {
      notesDisplay = notesDisplay.slice(0, 2000);
      warnings.push({
        code: "NOTES_TRUNCATED",
        message: "Remark truncated to 2000 characters.",
        field: "notes",
      });
    }

    const notesNorm = normalizePersonName(notesDisplay);
    const driverNorm = driverRaw ? normalizePersonName(driverRaw) : null;
    const customerNorm = customerRaw ? normalizePersonName(customerRaw) : null;

    const duplicateKey =
      plateNorm && fromParsed.iso && periodOk
        ? buildDuplicateKey({
            plateNorm,
            driverNorm,
            customerNorm,
            validFrom: fromParsed.iso,
            validUntil,
            notesNorm,
          })
        : null;

    if (duplicateKey && vehicleId && fromParsed.iso) {
      const exact = masters.assignments.find(
        (a) =>
          a.vehicleId === vehicleId &&
          a.validFrom === fromParsed.iso &&
          (a.validUntil ?? null) === validUntil,
      );
      // Full exact match also needs driver/customer — checked at confirm with IDs
      void exact;
    }

    let validationStatus: ValidationStatus = "OK";
    if (errors.some((e) => e.code.includes("OVERLAP") || e.code === "IN_FILE_OVERLAP")) {
      validationStatus = "CONFLICT";
    } else if (errors.length > 0) {
      validationStatus = "ERROR";
    } else if (needsNewDriver || needsNewCustomer) {
      validationStatus = "NEW_MASTER";
    } else if (warnings.length > 0) {
      validationStatus = "WARNING";
    }

    return {
      sourceRowNumber: row.sourceRowNumber,
      validationStatus,
      validationErrors: errors,
      validationWarnings: warnings,
      duplicateKey,
      vehicleId,
      driverId,
      customerId,
      needsNewDriver,
      needsNewCustomer,
      persistenceStatus: errors.length > 0 ? "not_attempted" : "pending",
      normalizedPayload: {
        registrationDisplay: plateDisplay,
        registrationNormalized: plateNorm,
        driverDisplay: driverRaw ? displayPersonName(driverRaw) : null,
        driverNormalized: driverNorm,
        customerDisplay: customerRaw ? displayPersonName(customerRaw) : null,
        customerNormalized: customerNorm,
        validFrom: fromParsed.iso,
        validUntil,
        notes: notesDisplay || null,
        notesNormalized: notesNorm,
        vehicleId,
        driverId,
        customerId,
        needsNewDriver,
        needsNewCustomer,
      },
    };
  });

  // In-file overlaps + exact duplicate siblings
  for (let i = 0; i < draft.length; i++) {
    const a = draft[i]!;
    const aFrom = a.normalizedPayload.validFrom as string | null;
    const aUntil = a.normalizedPayload.validUntil as string | null;
    const aVehicle = a.vehicleId;
    if (!aFrom || !aVehicle || a.validationStatus === "ERROR") continue;

    for (let j = i + 1; j < draft.length; j++) {
      const b = draft[j]!;
      const bFrom = b.normalizedPayload.validFrom as string | null;
      const bUntil = b.normalizedPayload.validUntil as string | null;
      if (!bFrom || b.vehicleId !== aVehicle) continue;
      if (
        periodsOverlap(
          { validFrom: aFrom, validUntil: aUntil },
          { validFrom: bFrom, validUntil: bUntil },
        )
      ) {
        const msg = {
          code: "IN_FILE_OVERLAP",
          message: `Overlaps another row in file (row ${b.sourceRowNumber}).`,
        };
        a.validationErrors.push(msg);
        b.validationErrors.push({
          code: "IN_FILE_OVERLAP",
          message: `Overlaps another row in file (row ${a.sourceRowNumber}).`,
        });
        a.validationStatus = "CONFLICT";
        b.validationStatus = "CONFLICT";
        a.persistenceStatus = "not_attempted";
        b.persistenceStatus = "not_attempted";
      }
    }
  }

  // vs DB overlap (non-exact)
  for (const row of draft) {
    if (row.validationStatus === "ERROR" || row.validationStatus === "CONFLICT") continue;
    const from = row.normalizedPayload.validFrom as string | null;
    const until = row.normalizedPayload.validUntil as string | null;
    if (!row.vehicleId || !from) continue;

    const overlaps = findOverlappingAssignments(
      { vehicleId: row.vehicleId, validFrom: from, validUntil: until },
      masters.assignments,
    );
    if (overlaps.length === 0) continue;

    // Exact duplicate → leave for skip at confirm (WARNING)
    const exact = overlaps.find(
      (o) => o.validFrom === from && (o.validUntil ?? null) === until,
    );
    if (exact && overlaps.length === 1) {
      row.validationWarnings.push({
        code: "EXACT_DUPLICATE_CANDIDATE",
        message: "Exact period already exists; will skip on confirm if parties match.",
      });
      if (row.validationStatus === "OK") {
        row.validationStatus = "WARNING";
      }
      continue;
    }

    row.validationErrors.push({
      code: "ASSIGNMENT_OVERLAP",
      message: "Overlaps an existing assignment for this vehicle.",
    });
    row.validationStatus = "CONFLICT";
    row.persistenceStatus = "not_attempted";
  }

  return draft;
}
