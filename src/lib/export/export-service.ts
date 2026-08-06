import { appError, type AppError } from "@/lib/assignments/errors";
import { isAppError, type AuthContext } from "@/lib/auth/session";
import { canReadTransportOrders } from "@/lib/auth/roles";
import { exportToExcel } from "@/lib/export/excel";
import { exportToPdf } from "@/lib/export/pdf";
import {
  normalizeExportFilters,
  orderMatchesFilters,
  type ExportFileResult,
  type ExportFilters,
  type ExportFormat,
  type ExportOrderBundle,
} from "@/lib/export/types";
import { getKmComparison } from "@/lib/maps/km-delta-service";
import { isKmDeltaError } from "@/lib/maps/km-delta-types";
import { getTransportOrderStore } from "@/lib/transport-orders/store/factory";
import { downloadPrivatePdf } from "@/lib/transport-orders/store/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Re-export for callers / tests (task API surface)
export { exportToExcel } from "@/lib/export/excel";
export { exportToPdf } from "@/lib/export/pdf";
export type { ExportFilters, ExportFormat, ExportOrderBundle } from "@/lib/export/types";

export type ExportRequestBody = ExportFilters & {
  format: ExportFormat;
};

export type BundleLoader = {
  load(filters: ExportFilters): Promise<ExportOrderBundle[] | AppError>;
};

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildExportFilename(format: ExportFormat, date = todayStamp()): string {
  return format === "excel"
    ? `transport-orders-${date}.xlsx`
    : `transport-orders-${date}.pdf`;
}

export function authorizeExport(
  auth: AuthContext | AppError,
): AuthContext | AppError {
  if (isAppError(auth)) return auth;
  if (!canReadTransportOrders(auth.role)) {
    return appError("FORBIDDEN", "Not allowed to export transport orders.");
  }
  return auth;
}

/** Load orders + optional KM rows + optional original PDF bytes (no AI). */
export async function loadExportBundles(
  filters: ExportFilters,
): Promise<ExportOrderBundle[] | AppError> {
  const opts = normalizeExportFilters(filters);
  const store = getTransportOrderStore();
  const listed = await store.listOrders();
  if (isAppError(listed)) return listed;

  const bundles: ExportOrderBundle[] = [];
  for (const row of listed) {
    const order = await store.getOrder(row.orderId);
    if (isAppError(order)) continue;

    let kmComparison = null;
    if (opts.includeKmComparison) {
      const km = await getKmComparison(order.header.orderId);
      if (!isKmDeltaError(km) && km) kmComparison = km;
    }

    let originalPdfBytes: Uint8Array | null = null;
    if (opts.includeOriginalPdf) {
      try {
        const supabase = await createSupabaseServerClient();
        const { data: doc } = await supabase
          .from("transport_order_documents")
          .select("storage_key")
          .eq("id", order.header.documentId)
          .maybeSingle();
        const key = (doc as { storage_key?: string } | null)?.storage_key;
        if (key) {
          const bytes = await downloadPrivatePdf(key);
          if (!isAppError(bytes)) originalPdfBytes = new Uint8Array(bytes);
        }
      } catch {
        console.warn("[export] original_pdf_load_failed");
      }
    }

    const bundle: ExportOrderBundle = {
      order,
      kmComparison,
      originalPdfBytes,
    };
    if (orderMatchesFilters(bundle, opts)) bundles.push(bundle);
  }

  return bundles;
}

export async function runExport(input: {
  auth: AuthContext | AppError;
  filters: ExportFilters;
  format: ExportFormat;
  loadBundles?: BundleLoader["load"];
}): Promise<ExportFileResult | AppError> {
  const auth = authorizeExport(input.auth);
  if (isAppError(auth)) return auth;

  const filters = normalizeExportFilters(input.filters);
  const load = input.loadBundles ?? loadExportBundles;
  const bundles = await load(filters);
  if (isAppError(bundles)) return bundles;

  switch (input.format) {
    case "excel": {
      const bytes = await exportToExcel(bundles, filters);
      return {
        bytes,
        filename: buildExportFilename("excel"),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }
    case "pdf": {
      const bytes = await exportToPdf(bundles, filters);
      return {
        bytes,
        filename: buildExportFilename("pdf"),
        contentType: "application/pdf",
      };
    }
    default: {
      const _exhaustive: never = input.format;
      return _exhaustive;
    }
  }
}

/** Compatibility helpers matching the task signature (bundles in, buffer out). */
export async function exportOrdersToExcel(
  orders: ExportOrderBundle[],
  filters: ExportFilters,
): Promise<Buffer> {
  return exportToExcel(orders, filters);
}

export async function exportOrdersToPdf(
  orders: ExportOrderBundle[],
  filters: ExportFilters,
  includeOriginalPdf?: boolean,
): Promise<Buffer> {
  return exportToPdf(orders, {
    ...filters,
    includeOriginalPdf: includeOriginalPdf ?? filters.includeOriginalPdf,
  });
}
