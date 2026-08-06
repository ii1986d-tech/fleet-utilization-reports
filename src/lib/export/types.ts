import type { KmComparisonResult } from "@/lib/maps/km-delta-types";
import type { WorkingTransportOrder } from "@/lib/transport-orders/types";

export type ExportFormat = "excel" | "pdf";

export type ExportStatusFilter = "all" | "pending" | "confirmed" | "completed";

export type ExportFilters = {
  dateFrom?: string;
  dateTo?: string;
  status?: ExportStatusFilter | string;
  dispatcherId?: string;
  includeKmComparison?: boolean;
  includeStops?: boolean;
  includeOriginalPdf?: boolean;
};

export type ExportOrderBundle = {
  order: WorkingTransportOrder;
  kmComparison: KmComparisonResult | null;
  /** Original PDF bytes when includeOriginalPdf was requested and load succeeded. */
  originalPdfBytes?: Uint8Array | null;
};

export type ExportFileResult = {
  bytes: Buffer;
  filename: string;
  contentType: string;
};

export function normalizeExportFilters(input: ExportFilters): Required<
  Pick<
    ExportFilters,
    "includeKmComparison" | "includeStops" | "includeOriginalPdf"
  >
> &
  ExportFilters {
  return {
    ...input,
    includeKmComparison: input.includeKmComparison !== false,
    includeStops: input.includeStops !== false,
    includeOriginalPdf: input.includeOriginalPdf === true,
  };
}

/** Derived export status for filtering / display (no AI). */
export function deriveOrderExportStatus(order: WorkingTransportOrder): ExportStatusFilter {
  if (order.header.reviewCompletedAt) return "completed";
  if (order.header.stopOrderReviewStatus === "confirmed") return "confirmed";
  return "pending";
}

export function orderMatchesFilters(
  bundle: ExportOrderBundle,
  filters: ExportFilters,
): boolean {
  const status = deriveOrderExportStatus(bundle.order);
  const wanted = (filters.status ?? "all").toLowerCase();
  if (wanted !== "all" && wanted !== status) return false;

  const dispatcher = filters.dispatcherId?.trim();
  if (dispatcher) {
    const clerk = bundle.order.header.responsibleClerk ?? "";
    const updatedBy = bundle.order.header.updatedBy ?? "";
    if (clerk !== dispatcher && updatedBy !== dispatcher) return false;
  }

  const stamp = bundle.order.header.updatedAt?.slice(0, 10) ?? "";
  if (filters.dateFrom && stamp && stamp < filters.dateFrom) return false;
  if (filters.dateTo && stamp && stamp > filters.dateTo) return false;

  return true;
}
