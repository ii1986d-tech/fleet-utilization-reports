import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type Pack006EvidenceEnv = {
  PACK006_NON_PRODUCTION_CONFIRMED: string;
  PACK006_TARGET: string;
  PACK006_SUPABASE_URL: string;
  PACK006_SUPABASE_ANON_KEY: string;
  PACK006_SUPABASE_SERVICE_ROLE_KEY: string;
  PACK006_PRIVATE_BUCKET: string;
  PACK006_ADMIN_EMAIL: string;
  PACK006_ADMIN_PASSWORD: string;
  PACK006_MANAGER_EMAIL: string;
  PACK006_MANAGER_PASSWORD: string;
  PACK006_VIEWER_EMAIL: string;
  PACK006_VIEWER_PASSWORD: string;
};

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Load evidence env from process + optional scripts/pack006-evidence/.env.local */
export function loadPack006EvidenceEnv(): Pack006EvidenceEnv {
  if (process.env.PACK006_DB_EVIDENCE !== "1") {
    throw new Error("PACK006_DB_EVIDENCE must be 1 for live suite");
  }
  const filePath = resolve(process.cwd(), "scripts/pack006-evidence/.env.local");
  const fromFile = existsSync(filePath) ? parseEnvFile(readFileSync(filePath, "utf8")) : {};
  const get = (key: keyof Pack006EvidenceEnv | string): string => {
    const v = process.env[key] ?? fromFile[key] ?? "";
    return v;
  };
  if ((get("PACK006_NON_PRODUCTION_CONFIRMED") || "").toLowerCase() !== "true") {
    throw new Error("PACK006_NON_PRODUCTION_CONFIRMED must be true");
  }
  const target = (get("PACK006_TARGET") || "").toLowerCase();
  if (target !== "local" && target !== "remote") {
    throw new Error("PACK006_TARGET must be local or remote");
  }
  const required: Array<keyof Pack006EvidenceEnv> = [
    "PACK006_SUPABASE_URL",
    "PACK006_SUPABASE_ANON_KEY",
    "PACK006_SUPABASE_SERVICE_ROLE_KEY",
    "PACK006_ADMIN_EMAIL",
    "PACK006_ADMIN_PASSWORD",
    "PACK006_MANAGER_EMAIL",
    "PACK006_MANAGER_PASSWORD",
    "PACK006_VIEWER_EMAIL",
    "PACK006_VIEWER_PASSWORD",
  ];
  for (const key of required) {
    if (!get(key)) throw new Error(`Missing evidence env: ${key}`);
  }
  return {
    PACK006_NON_PRODUCTION_CONFIRMED: "true",
    PACK006_TARGET: target,
    PACK006_SUPABASE_URL: get("PACK006_SUPABASE_URL"),
    PACK006_SUPABASE_ANON_KEY: get("PACK006_SUPABASE_ANON_KEY"),
    PACK006_SUPABASE_SERVICE_ROLE_KEY: get("PACK006_SUPABASE_SERVICE_ROLE_KEY"),
    PACK006_PRIVATE_BUCKET: get("PACK006_PRIVATE_BUCKET") || "transport-order-pdfs",
    PACK006_ADMIN_EMAIL: get("PACK006_ADMIN_EMAIL"),
    PACK006_ADMIN_PASSWORD: get("PACK006_ADMIN_PASSWORD"),
    PACK006_MANAGER_EMAIL: get("PACK006_MANAGER_EMAIL"),
    PACK006_MANAGER_PASSWORD: get("PACK006_MANAGER_PASSWORD"),
    PACK006_VIEWER_EMAIL: get("PACK006_VIEWER_EMAIL"),
    PACK006_VIEWER_PASSWORD: get("PACK006_VIEWER_PASSWORD"),
  };
}

export function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function signIn(
  env: Pack006EvidenceEnv,
  role: "admin" | "manager" | "viewer",
): Promise<{ client: SupabaseClient; userId: string }> {
  const email =
    role === "admin"
      ? env.PACK006_ADMIN_EMAIL
      : role === "manager"
        ? env.PACK006_MANAGER_EMAIL
        : env.PACK006_VIEWER_EMAIL;
  const password =
    role === "admin"
      ? env.PACK006_ADMIN_PASSWORD
      : role === "manager"
        ? env.PACK006_MANAGER_PASSWORD
        : env.PACK006_VIEWER_PASSWORD;
  const client = makeClient(env.PACK006_SUPABASE_URL, env.PACK006_SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`sign-in ${role} failed: ${error?.message}`);
  if (data.user.app_metadata?.role !== role) {
    throw new Error(`role mismatch for ${role}`);
  }
  return { client, userId: data.user.id };
}

export function syntheticPdf(label: string): Buffer {
  return Buffer.from(`%PDF-1.4\n%${label}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`, "utf8");
}

export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Minimal working-order JSON for persist_transport_order_extraction (synthetic). */
export function buildSyntheticWorkingOrder(documentId: string): {
  orderId: string;
  runId: string;
  extractionId: string;
  working: Record<string, unknown>;
  stopIds: string[];
  pickupId: string;
  deliveryId: string;
} {
  const orderId = randomUUID();
  const runId = randomUUID();
  const extractionId = randomUUID();
  const pickupId = randomUUID();
  const deliveryId = randomUUID();
  const positionId = randomUUID();
  const legId = randomUUID();

  const field = (
    entityType: string,
    entityId: string,
    fieldName: string,
    value: unknown,
  ): Record<string, unknown> => ({
    identity: { entityType, entityId, fieldName },
    extractedValue: value,
    currentValue: value,
    reviewStatus: "pending_review",
  });

  const working = {
    header: {
      orderId,
      documentId,
      version: 1,
      tourNumber: "SYN-TOUR-1",
      borderoNumber: null,
      businessIdentifier: "SYN-BIZ-1",
      referenceNumbers: [],
      responsibleClerk: "Synthetic Clerk",
      remarks: null,
      freight: { amount: 10, currency: "EUR" },
      paidKilometers: 100,
      emptyKilometers: 0,
      truckLicensePlate: "SYN-TRUCK-1",
      trailerLicensePlate: null,
      cargoWeightKg: 1000,
      cargoLoadingMeters: null,
      cargoVolumeM3: null,
      cargoDescription: "synthetic cargo",
      mapsStaticUrl: null,
      stopOrderReviewStatus: "pending_review",
    },
    stops: [
      {
        stopId: pickupId,
        orderId,
        sequence: 1,
        type: "pickup",
        address: {
          company: "Syn Pickup Co",
          street: "1 Test St",
          houseNumber: "1",
          postalCode: "10115",
          city: "Berlin",
          country: "DE",
          rawAddressText: "1 Test St, Berlin",
        },
        date: "2026-08-01",
        timeWindow: null,
        references: [],
        remarks: null,
      },
      {
        stopId: deliveryId,
        orderId,
        sequence: 2,
        type: "delivery",
        address: {
          company: "Syn Delivery Co",
          street: "2 Test Ave",
          houseNumber: "2",
          postalCode: "80331",
          city: "Munich",
          country: "DE",
          rawAddressText: "2 Test Ave, Munich",
        },
        date: "2026-08-02",
        timeWindow: null,
        references: [],
        remarks: null,
      },
    ],
    partialLoadPositions: [
      {
        positionId,
        orderId,
        positionNumber: 1,
        pickupStopId: pickupId,
        deliveryStopId: deliveryId,
        references: [],
        weightKg: 500,
        loadingMeters: null,
        volumeM3: null,
      },
    ],
    legs: [
      {
        legId,
        orderId,
        sequence: 1,
        originStopId: pickupId,
        destinationStopId: deliveryId,
        references: [],
        distanceKm: 500,
      },
    ],
    fieldReviews: [
      field("order", orderId, "tourNumber", "SYN-TOUR-1"),
      field("order", orderId, "borderoNumber", null),
      field("order", orderId, "businessIdentifier", "SYN-BIZ-1"),
      field("order", orderId, "responsibleClerk", "Synthetic Clerk"),
      field("order", orderId, "remarks", null),
      field("order", orderId, "freightAmount", 10),
      field("order", orderId, "freightCurrency", "EUR"),
      field("order", orderId, "paidKilometers", 100),
      field("order", orderId, "emptyKilometers", 0),
      field("order", orderId, "truckLicensePlate", "SYN-TRUCK-1"),
      field("order", orderId, "trailerLicensePlate", null),
      field("order", orderId, "cargoWeightKg", 1000),
      field("order", orderId, "cargoLoadingMeters", null),
      field("order", orderId, "cargoVolumeM3", null),
      field("order", orderId, "cargoDescription", "synthetic cargo"),
      field("stop", pickupId, "type", "pickup"),
      field("stop", pickupId, "sequence", 1),
      field("stop", pickupId, "company", "Syn Pickup Co"),
      field("stop", pickupId, "street", "1 Test St"),
      field("stop", pickupId, "postalCode", "10115"),
      field("stop", pickupId, "city", "Berlin"),
      field("stop", pickupId, "country", "DE"),
      field("stop", pickupId, "rawAddressText", "1 Test St, Berlin"),
      field("stop", pickupId, "date", "2026-08-01"),
      field("stop", pickupId, "timeWindow", null),
      field("stop", deliveryId, "type", "delivery"),
      field("stop", deliveryId, "sequence", 2),
      field("stop", deliveryId, "company", "Syn Delivery Co"),
      field("stop", deliveryId, "street", "2 Test Ave"),
      field("stop", deliveryId, "postalCode", "80331"),
      field("stop", deliveryId, "city", "Munich"),
      field("stop", deliveryId, "country", "DE"),
      field("stop", deliveryId, "rawAddressText", "2 Test Ave, Munich"),
      field("stop", deliveryId, "date", "2026-08-02"),
      field("stop", deliveryId, "timeWindow", null),
      field("partial_load_position", positionId, "pickupStopId", pickupId),
      field("partial_load_position", positionId, "deliveryStopId", deliveryId),
      field("transport_leg", legId, "originStopId", pickupId),
      field("transport_leg", legId, "destinationStopId", deliveryId),
    ],
    snapshot: {
      extractionId,
      extractionRunId: runId,
      documentId,
      orderId,
      normalizedPayload: { synthetic: true, label: "pack006-evidence" },
    },
  };

  return {
    orderId,
    runId,
    extractionId,
    working,
    stopIds: [pickupId, deliveryId],
    pickupId,
    deliveryId,
  };
}

export async function uploadAndRegister(input: {
  client: SupabaseClient;
  service: SupabaseClient;
  bucket: string;
  idempotencyKey: string;
  bytes: Buffer;
  filename?: string;
}): Promise<{ documentId: string; storageKey: string; reused: boolean }> {
  const hash = sha256Hex(input.bytes);
  const storageKey = `transport-orders/ev/${hash.slice(0, 8)}-${randomUUID()}.pdf`;

  const { error: upErr } = await input.service.storage.from(input.bucket).upload(storageKey, input.bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

  const { data, error } = await input.client.rpc("register_transport_order_upload", {
    p_idempotency_key: input.idempotencyKey,
    p_sha256_hex: hash,
    p_storage_key: storageKey,
    p_sanitized_filename: input.filename ?? "synthetic-evidence.pdf",
    p_size_bytes: input.bytes.length,
  });
  if (error) {
    await input.service.storage.from(input.bucket).remove([storageKey]);
    throw new Error(`register upload failed: ${error.message}`);
  }
  const row = data as { document_id: string; storage_key: string; reused: boolean };
  if (row.reused && row.storage_key !== storageKey) {
    await input.service.storage.from(input.bucket).remove([storageKey]);
  }
  return {
    documentId: row.document_id,
    storageKey: row.storage_key,
    reused: Boolean(row.reused),
  };
}

export async function persistSyntheticOrder(
  client: SupabaseClient,
  documentId: string,
  idempotencyKey: string,
): Promise<ReturnType<typeof buildSyntheticWorkingOrder>> {
  const built = buildSyntheticWorkingOrder(documentId);
  const requestHash = sha256Hex(Buffer.from(`${documentId}|${idempotencyKey}|synthetic`));
  const { data, error } = await client.rpc("persist_transport_order_extraction", {
    p_document_id: documentId,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_provider: "mock",
    p_model: "mock-v1",
    p_prompt_version: "pack006.prompt.v1",
    p_schema_version: "pack006.extraction.v1",
    p_working_order: built.working,
  });
  if (error) throw new Error(`persist extraction failed: ${error.message}`);
  const persisted = data as { order_id: string };
  if (persisted.order_id !== built.orderId && !persisted.order_id) {
    throw new Error("persist returned empty order_id");
  }
  return built;
}

export async function confirmAllFieldsAndStopOrder(
  client: SupabaseClient,
  orderId: string,
  expectedVersion: number,
): Promise<number> {
  const { data: fields, error } = await client
    .from("transport_order_field_reviews")
    .select("entity_type, entity_id, field_name")
    .eq("order_id", orderId);
  if (error) throw new Error(error.message);
  const confirms = (fields ?? []).map((f) => ({
    entityType: f.entity_type,
    entityId: f.entity_id,
    fieldName: f.field_name,
  }));
  const { error: mutErr } = await client.rpc("mutate_transport_order_review", {
    p_order_id: orderId,
    p_expected_version: expectedVersion,
    p_patches: [],
    p_confirms: confirms,
    p_mark_missing: [],
    p_mark_not_applicable: [],
  });
  if (mutErr) throw new Error(`confirm fields failed: ${mutErr.message}`);
  const { data: ord } = await client
    .from("transport_orders")
    .select("version")
    .eq("id", orderId)
    .single();
  const v = ord?.version as number;
  const { error: stopErr } = await client.rpc("confirm_transport_order_stop_order", {
    p_order_id: orderId,
    p_expected_version: v,
  });
  if (stopErr) throw new Error(`confirm stop order failed: ${stopErr.message}`);
  const { data: after } = await client
    .from("transport_orders")
    .select("version")
    .eq("id", orderId)
    .single();
  return after?.version as number;
}

export async function cleanupOrder(service: SupabaseClient, documentId: string, bucket: string, storageKey: string) {
  await service.from("transport_order_documents").delete().eq("id", documentId);
  await service.storage.from(bucket).remove([storageKey]);
}
