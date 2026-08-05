import { z } from "zod";
import {
  AUDIT_ACTIONS,
  ENTITY_TYPES,
  REVIEW_STATUSES,
  STOP_TYPES,
} from "@/lib/transport-orders/types";

export const EXTRACTION_SCHEMA_VERSION = "pack006.extraction.v1";
export const PROMPT_VERSION_MOCK = "mock.v1";

export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export const stopTypeSchema = z.enum(STOP_TYPES);
export const entityTypeSchema = z.enum(ENTITY_TYPES);
export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export const moneySchema = z.object({
  amount: z.number().nonnegative().nullable(),
  currency: z.string().trim().min(1).max(8).nullable(),
});

export const stopAddressSchema = z.object({
  company: z.string().trim().max(300).nullable(),
  street: z.string().trim().max(300).nullable(),
  houseNumber: z.string().trim().max(32).nullable(),
  postalCode: z.string().trim().max(32).nullable(),
  city: z.string().trim().max(200).nullable(),
  country: z.string().trim().max(80).nullable(),
  rawAddressText: z.string().trim().max(1000).nullable(),
});

export const extractedStopSchema = z.object({
  sequence: z.number().int().positive(),
  type: stopTypeSchema,
  address: stopAddressSchema,
  date: z.string().trim().max(64).nullable(),
  timeWindow: z.string().trim().max(128).nullable(),
  references: z.array(z.string().trim().max(200)).default([]),
  remarks: z.string().trim().max(2000).nullable(),
});

export const extractedPartialLoadSchema = z.object({
  positionNumber: z.number().int().positive().nullable(),
  pickupSequence: z.number().int().positive(),
  deliverySequence: z.number().int().positive(),
  references: z.array(z.string().trim().max(200)).default([]),
  weightKg: z.number().nonnegative().nullable(),
  loadingMeters: z.number().nonnegative().nullable(),
  volumeM3: z.number().nonnegative().nullable(),
});

export const extractedLegSchema = z.object({
  sequence: z.number().int().positive(),
  originSequence: z.number().int().positive(),
  destinationSequence: z.number().int().positive(),
  references: z.array(z.string().trim().max(200)).default([]),
  distanceKm: z.number().nonnegative().nullable(),
});

/** Strict internal extraction result — provider adapters must normalize to this. */
export const extractionResultSchema = z.object({
  schemaVersion: z.literal(EXTRACTION_SCHEMA_VERSION),
  tourNumber: z.string().trim().max(120).nullable(),
  borderoNumber: z.string().trim().max(120).nullable(),
  businessIdentifier: z.string().trim().max(120).nullable(),
  referenceNumbers: z.array(z.string().trim().max(200)).default([]),
  responsibleClerk: z.string().trim().max(200).nullable(),
  remarks: z.string().trim().max(4000).nullable(),
  freight: moneySchema,
  paidKilometers: z.number().nonnegative().nullable(),
  emptyKilometers: z.number().nonnegative().nullable(),
  truckLicensePlate: z.string().trim().max(32).nullable(),
  trailerLicensePlate: z.string().trim().max(32).nullable(),
  cargoWeightKg: z.number().nonnegative().nullable(),
  cargoLoadingMeters: z.number().nonnegative().nullable(),
  cargoVolumeM3: z.number().nonnegative().nullable(),
  cargoDescription: z.string().trim().max(500).nullable(),
  paidKilometersSource: z.string().trim().max(120).nullable().optional(),
  freightSource: z.string().trim().max(120).nullable().optional(),
  stops: z.array(extractedStopSchema).min(1),
  partialLoadPositions: z.array(extractedPartialLoadSchema).default([]),
  transportLegs: z.array(extractedLegSchema).default([]),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const fieldIdentitySchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  fieldName: z.string().trim().min(1).max(120),
});

export const saveFieldPatchSchema = z.object({
  identity: fieldIdentitySchema,
  currentValue: z.any(),
});

export const mutateReviewRequestSchema = z.object({
  orderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  patches: z.array(saveFieldPatchSchema).default([]),
  confirms: z.array(fieldIdentitySchema).default([]),
  markMissing: z.array(fieldIdentitySchema).default([]),
  markNotApplicable: z.array(fieldIdentitySchema).default([]),
});

export const reorderStopsRequestSchema = z.object({
  orderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  orderedStopIds: z.array(z.string().uuid()).min(1),
});

export const completeReviewRequestSchema = z.object({
  orderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  completionIdempotencyKey: z.string().trim().min(8).max(200).optional(),
});

export const uploadIdempotencySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
});

export function parseExtractionResult(input: unknown): ExtractionResult {
  return extractionResultSchema.parse(input);
}

export function safeParseExtractionResult(input: unknown) {
  return extractionResultSchema.safeParse(input);
}
