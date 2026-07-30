export const IMPORT_CONFIG_VERSION = "p003-v1";
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportJobStatus =
  | "uploaded"
  | "parsed"
  | "validated"
  | "confirming"
  | "completed"
  | "completed_with_errors"
  | "failed";

export type ValidationStatus = "OK" | "WARNING" | "ERROR" | "CONFLICT" | "NEW_MASTER";

export type PersistenceStatus =
  | "pending"
  | "imported"
  | "skipped"
  | "failed"
  | "not_attempted";

export type CanonicalField =
  | "registration"
  | "driver"
  | "customer"
  | "valid_from"
  | "valid_until"
  | "notes";

const ALIAS_MAP: Record<string, CanonicalField> = {
  kennzeichen: "registration",
  registration: "registration",
  registration_number: "registration",
  vehicle: "registration",
  fahrzeug: "registration",
  fahrer: "driver",
  driver: "driver",
  driver_name: "driver",
  full_name: "driver",
  auftraggeber: "customer",
  customer: "customer",
  customer_name: "customer",
  kunde: "customer",
  "gültig ab": "valid_from",
  "gueltig ab": "valid_from",
  valid_from: "valid_from",
  from: "valid_from",
  start: "valid_from",
  von: "valid_from",
  "gültig bis": "valid_until",
  "gueltig bis": "valid_until",
  valid_until: "valid_until",
  until: "valid_until",
  end: "valid_until",
  bis: "valid_until",
  bemerkung: "notes",
  notes: "notes",
  comment: "notes",
  kommentar: "notes",
};

export function normalizeHeaderKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapHeaderToCanonical(raw: string): CanonicalField | null {
  const key = normalizeHeaderKey(raw);
  return ALIAS_MAP[key] ?? null;
}

export type HeaderMapping = Partial<Record<CanonicalField, number>>;

export function buildHeaderMapping(headers: string[]): {
  mapping: HeaderMapping;
  errors: string[];
} {
  const mapping: HeaderMapping = {};
  const errors: string[] = [];
  const seen = new Map<CanonicalField, string>();

  headers.forEach((header, index) => {
    if (!header || !header.trim()) {
      return;
    }
    const canonical = mapHeaderToCanonical(header);
    if (!canonical) {
      return;
    }
    const prior = seen.get(canonical);
    if (prior !== undefined) {
      errors.push(`Duplicate header for ${canonical}: "${prior}" and "${header}"`);
      return;
    }
    seen.set(canonical, header);
    mapping[canonical] = index;
  });

  if (mapping.registration === undefined) {
    errors.push("Missing required header for registration (Kennzeichen).");
  }
  if (mapping.valid_from === undefined) {
    errors.push("Missing required header for valid_from (Gültig ab).");
  }

  return { mapping, errors };
}
