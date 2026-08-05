import {
  EXTRACTION_SCHEMA_VERSION,
  extractionResultSchema,
  type ExtractionResult,
} from "@/lib/transport-orders/schema";

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length === 0 ? null : t;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asNullableString(v))
    .filter((v): v is string => v !== null);
}

function normalizeAddress(raw: unknown) {
  const a = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    company: asNullableString(a.company),
    street: asNullableString(a.street),
    houseNumber: asNullableString(a.houseNumber ?? a.house_number),
    postalCode: asNullableString(a.postalCode ?? a.postal_code ?? a.zip),
    city: asNullableString(a.city),
    country: asNullableString(a.country),
    rawAddressText: asNullableString(a.rawAddressText ?? a.raw_address_text ?? a.raw),
  };
}

/**
 * Best-effort normalization from provider JSON into the strict internal schema.
 * Does not invent operational values beyond structural defaults (empty arrays).
 */
export function normalizeProviderExtraction(raw: unknown): ExtractionResult {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const freightRaw =
    root.freight && typeof root.freight === "object"
      ? (root.freight as Record<string, unknown>)
      : {};

  const stopsIn = Array.isArray(root.stops) ? root.stops : [];
  const stops = stopsIn.map((s, idx) => {
    const row = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
    const typeRaw = asNullableString(row.type)?.toLowerCase();
    const type =
      typeRaw === "pickup" || typeRaw === "delivery" || typeRaw === "other"
        ? typeRaw
        : idx === 0
          ? "pickup"
          : "delivery";
    return {
      sequence: asNumber(row.sequence) ?? idx + 1,
      type,
      address: normalizeAddress(row.address),
      date: asNullableString(row.date),
      timeWindow: asNullableString(row.timeWindow ?? row.time_window),
      references: asStringArray(row.references),
      remarks: asNullableString(row.remarks),
    };
  });

  const candidate = {
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    tourNumber: asNullableString(root.tourNumber ?? root.tour_number),
    borderoNumber: asNullableString(root.borderoNumber ?? root.bordero_number),
    businessIdentifier: asNullableString(
      root.businessIdentifier ?? root.business_identifier ?? root.tourNumber,
    ),
    referenceNumbers: asStringArray(root.referenceNumbers ?? root.reference_numbers),
    responsibleClerk: asNullableString(root.responsibleClerk ?? root.responsible_clerk),
    remarks: asNullableString(root.remarks),
    freight: {
      amount: asNumber(freightRaw.amount),
      currency: asNullableString(freightRaw.currency),
    },
    paidKilometers: asNumber(root.paidKilometers ?? root.paid_kilometers),
    emptyKilometers: asNumber(root.emptyKilometers ?? root.empty_kilometers),
    truckLicensePlate: asNullableString(root.truckLicensePlate ?? root.truck_license_plate),
    trailerLicensePlate: asNullableString(
      root.trailerLicensePlate ?? root.trailer_license_plate,
    ),
    cargoWeightKg: asNumber(root.cargoWeightKg ?? root.cargo_weight_kg),
    cargoLoadingMeters: asNumber(root.cargoLoadingMeters ?? root.cargo_loading_meters),
    cargoVolumeM3: asNumber(root.cargoVolumeM3 ?? root.cargo_volume_m3),
    cargoDescription: asNullableString(root.cargoDescription ?? root.cargo_description),
    stops,
    partialLoadPositions: Array.isArray(root.partialLoadPositions)
      ? root.partialLoadPositions
      : Array.isArray(root.partial_load_positions)
        ? root.partial_load_positions
        : [],
    transportLegs: Array.isArray(root.transportLegs)
      ? root.transportLegs
      : Array.isArray(root.transport_legs)
        ? root.transport_legs
        : [],
  };

  const parsed = extractionResultSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`Normalized extraction failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Minimal skeleton for Manual mode (human completes fields). */
export function manualSkeletonExtraction(filename: string): ExtractionResult {
  const hint = filename.replace(/\.pdf$/i, "").slice(0, 120) || null;
  return normalizeProviderExtraction({
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    tourNumber: hint,
    borderoNumber: null,
    businessIdentifier: hint,
    referenceNumbers: [],
    responsibleClerk: null,
    remarks: "Manual extraction mode — complete and confirm all fields.",
    freight: { amount: null, currency: null },
    paidKilometers: null,
    emptyKilometers: null,
    truckLicensePlate: null,
    trailerLicensePlate: null,
    cargoWeightKg: null,
    cargoLoadingMeters: null,
    cargoVolumeM3: null,
    cargoDescription: null,
    stops: [
      {
        sequence: 1,
        type: "pickup",
        address: {
          company: null,
          street: null,
          houseNumber: null,
          postalCode: null,
          city: null,
          country: null,
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: [],
        remarks: null,
      },
      {
        sequence: 2,
        type: "delivery",
        address: {
          company: null,
          street: null,
          houseNumber: null,
          postalCode: null,
          city: null,
          country: null,
          rawAddressText: null,
        },
        date: null,
        timeWindow: null,
        references: [],
        remarks: null,
      },
    ],
    partialLoadPositions: [],
    transportLegs: [],
  });
}
