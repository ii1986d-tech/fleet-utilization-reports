import { appError, type AppError } from "@/lib/assignments/errors";
import type {
  AuditEvent,
  FieldReview,
  PartialLoadPosition,
  ReviewStatus,
  StopType,
  TransportLeg,
  TransportOrderStop,
  WorkingTransportOrder,
} from "@/lib/transport-orders/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type DbClient = SupabaseClient;

function asReviewStatus(value: string): ReviewStatus {
  return value as ReviewStatus;
}

function asStopType(value: string): StopType {
  return value as StopType;
}

export async function loadWorkingTransportOrder(
  supabase: DbClient,
  orderId: string,
): Promise<WorkingTransportOrder | AppError> {
  const { data: ord, error: ordErr } = await supabase
    .from("transport_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (ordErr) return appError("INTERNAL_ERROR", "Failed to load order.");
  if (!ord) return appError("NOT_FOUND", "Order not found.");

  const [
    { data: stops },
    { data: positions },
    { data: legs },
    { data: fields },
    { data: snapshot },
    { data: events },
  ] = await Promise.all([
    supabase.from("transport_order_stops").select("*").eq("order_id", orderId).order("sequence"),
    supabase.from("transport_order_partial_load_positions").select("*").eq("order_id", orderId),
    supabase.from("transport_order_legs").select("*").eq("order_id", orderId).order("sequence"),
    supabase.from("transport_order_field_reviews").select("*").eq("order_id", orderId),
    supabase
      .from("transport_order_extracted_snapshots")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("transport_order_field_review_events")
      .select("*")
      .eq("order_id", orderId)
      .order("occurred_at", { ascending: true }),
  ]);

  const mappedStops: TransportOrderStop[] = (stops ?? []).map((s) => ({
    stopId: s.stop_id as string,
    orderId: s.order_id as string,
    sequence: s.sequence as number,
    type: asStopType(s.stop_type as string),
    address: {
      company: (s.company as string | null) ?? null,
      street: (s.street as string | null) ?? null,
      houseNumber: (s.house_number as string | null) ?? null,
      postalCode: (s.postal_code as string | null) ?? null,
      city: (s.city as string | null) ?? null,
      country: (s.country as string | null) ?? null,
      rawAddressText: (s.raw_address_text as string | null) ?? null,
    },
    date: (s.stop_date as string | null) ?? null,
    timeWindow: (s.time_window as string | null) ?? null,
    references: Array.isArray(s.ref_values) ? (s.ref_values as string[]) : [],
    remarks: (s.remarks as string | null) ?? null,
  }));

  const mappedPositions: PartialLoadPosition[] = (positions ?? []).map((p) => ({
    positionId: p.position_id as string,
    orderId: p.order_id as string,
    positionNumber: (p.position_number as number | null) ?? null,
    pickupStopId: p.pickup_stop_id as string,
    deliveryStopId: p.delivery_stop_id as string,
    references: Array.isArray(p.ref_values) ? (p.ref_values as string[]) : [],
    weightKg: p.weight_kg == null ? null : Number(p.weight_kg),
    loadingMeters: p.loading_meters == null ? null : Number(p.loading_meters),
    volumeM3: p.volume_m3 == null ? null : Number(p.volume_m3),
  }));

  const mappedLegs: TransportLeg[] = (legs ?? []).map((l) => ({
    legId: l.leg_id as string,
    orderId: l.order_id as string,
    sequence: l.sequence as number,
    originStopId: l.origin_stop_id as string,
    destinationStopId: l.destination_stop_id as string,
    references: Array.isArray(l.ref_values) ? (l.ref_values as string[]) : [],
    distanceKm: l.distance_km == null ? null : Number(l.distance_km),
  }));

  const mappedFields: FieldReview[] = (fields ?? []).map((f) => ({
    identity: {
      entityType: f.entity_type as FieldReview["identity"]["entityType"],
      entityId: f.entity_id as string,
      fieldName: f.field_name as string,
    },
    extractedValue: f.extracted_value,
    currentValue: f.current_value,
    reviewStatus: asReviewStatus(f.review_status as string),
    extractionConfidence: f.extraction_confidence == null ? null : Number(f.extraction_confidence),
    sourcePage: (f.source_page as number | null) ?? null,
    sourceSnippet: (f.source_snippet as string | null) ?? null,
    provider: (f.provider as string | null) ?? null,
    model: (f.model as string | null) ?? null,
    extractionRunId: (f.extraction_run_id as string | null) ?? null,
    editedBy: (f.edited_by as string | null) ?? null,
    editedAt: (f.edited_at as string | null) ?? null,
    confirmedBy: (f.confirmed_by as string | null) ?? null,
    confirmedAt: (f.confirmed_at as string | null) ?? null,
    note: (f.note as string | null) ?? null,
  }));

  const auditEvents: AuditEvent[] = (events ?? []).map((e) => ({
    id: e.id as string,
    orderId: e.order_id as string,
    action: e.action as AuditEvent["action"],
    actorId: (e.actor_id as string | null) ?? null,
    actorRole: (e.actor_role as string | null) ?? null,
    timestamp: e.occurred_at as string,
    versionBefore: (e.version_before as number | null) ?? null,
    versionAfter: (e.version_after as number | null) ?? null,
    entityType: (e.entity_type as AuditEvent["entityType"]) ?? null,
    entityId: (e.entity_id as string | null) ?? null,
    fieldName: (e.field_name as string | null) ?? null,
    oldValue: e.old_value,
    newValue: e.new_value,
    reasonCode: (e.reason_code as string | null) ?? null,
    provider: (e.provider as string | null) ?? null,
    model: (e.model as string | null) ?? null,
    promptVersion: (e.prompt_version as string | null) ?? null,
    schemaVersion: (e.schema_version as string | null) ?? null,
  }));

  return {
    header: {
      orderId: ord.id as string,
      documentId: ord.document_id as string,
      version: ord.version as number,
      tourNumber: (ord.tour_number as string | null) ?? null,
      borderoNumber: (ord.bordero_number as string | null) ?? null,
      businessIdentifier: (ord.business_identifier as string | null) ?? null,
      referenceNumbers: Array.isArray(ord.reference_numbers)
        ? (ord.reference_numbers as string[])
        : [],
      responsibleClerk: (ord.responsible_clerk as string | null) ?? null,
      remarks: (ord.remarks as string | null) ?? null,
      freight: {
        amount: ord.freight_amount == null ? null : Number(ord.freight_amount),
        currency: (ord.freight_currency as string | null) ?? null,
      },
      paidKilometers: ord.paid_kilometers == null ? null : Number(ord.paid_kilometers),
      emptyKilometers: ord.empty_kilometers == null ? null : Number(ord.empty_kilometers),
      truckLicensePlate: (ord.truck_license_plate as string | null) ?? null,
      trailerLicensePlate: (ord.trailer_license_plate as string | null) ?? null,
      cargoWeightKg: ord.cargo_weight_kg == null ? null : Number(ord.cargo_weight_kg),
      cargoLoadingMeters:
        ord.cargo_loading_meters == null ? null : Number(ord.cargo_loading_meters),
      cargoVolumeM3: ord.cargo_volume_m3 == null ? null : Number(ord.cargo_volume_m3),
      cargoDescription: (ord.cargo_description as string | null) ?? null,
      mapsStaticUrl: (ord.maps_static_url as string | null) ?? null,
      stopOrderReviewStatus: asReviewStatus(ord.stop_order_review_status as string),
      reviewCompletedAt: (ord.review_completed_at as string | null) ?? null,
      updatedAt: ord.updated_at as string,
      updatedBy: (ord.updated_by as string | null) ?? null,
    },
    stops: mappedStops,
    partialLoadPositions: mappedPositions,
    legs: mappedLegs,
    fieldReviews: mappedFields,
    snapshot: snapshot
      ? {
          extractionId: snapshot.id as string,
          extractionRunId: snapshot.extraction_run_id as string,
          documentId: snapshot.document_id as string,
          orderId: snapshot.order_id as string,
          provider: snapshot.provider as string,
          model: snapshot.model as string,
          promptVersion: snapshot.prompt_version as string,
          schemaVersion: snapshot.schema_version as string,
          normalizedPayload: snapshot.normalized_payload,
          createdAt: snapshot.created_at as string,
        }
      : null,
    auditEvents,
  };
}
