import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { isAppError } from "@/lib/auth/session";
import {
  authorizeExport,
  buildExportFilename,
  exportToExcel,
  exportToPdf,
  runExport,
} from "@/lib/export/export-service";
import {
  deriveOrderExportStatus,
  orderMatchesFilters,
  type ExportOrderBundle,
} from "@/lib/export/types";
import type { WorkingTransportOrder } from "@/lib/transport-orders/types";

function makeOrder(partial?: {
  orderId?: string;
  paidKilometers?: number | null;
  reviewCompletedAt?: string | null;
  stopOrderReviewStatus?: WorkingTransportOrder["header"]["stopOrderReviewStatus"];
  responsibleClerk?: string | null;
  updatedAt?: string;
}): WorkingTransportOrder {
  const orderId = partial?.orderId ?? "order-1";
  return {
    header: {
      orderId,
      documentId: "doc-1",
      version: 1,
      tourNumber: "T-100",
      borderoNumber: null,
      businessIdentifier: "T-100",
      referenceNumbers: [],
      responsibleClerk: partial?.responsibleClerk ?? "Dispatcher A",
      remarks: null,
      freight: { amount: 120, currency: "EUR" },
      paidKilometers: partial?.paidKilometers ?? 300,
      emptyKilometers: null,
      truckLicensePlate: "HH-AB 123",
      trailerLicensePlate: null,
      cargoWeightKg: 1000,
      cargoLoadingMeters: 2,
      cargoVolumeM3: null,
      cargoDescription: "Goods",
      mapsStaticUrl: null,
      stopOrderReviewStatus: partial?.stopOrderReviewStatus ?? "confirmed",
      reviewCompletedAt: partial?.reviewCompletedAt ?? null,
      updatedAt: partial?.updatedAt ?? "2026-08-05T12:00:00.000Z",
      updatedBy: "user-1",
    },
    stops: [
      {
        stopId: "s1",
        orderId,
        sequence: 1,
        type: "pickup",
        address: {
          company: "Acme",
          street: "Main",
          houseNumber: "1",
          postalCode: "20095",
          city: "Hamburg",
          country: "DE",
          rawAddressText: null,
        },
        date: "2026-08-05",
        timeWindow: "08:00-12:00",
        references: [],
        remarks: null,
      },
      {
        stopId: "s2",
        orderId,
        sequence: 2,
        type: "delivery",
        address: {
          company: "Beta",
          street: "Ost",
          houseNumber: "2",
          postalCode: "80331",
          city: "München",
          country: "DE",
          rawAddressText: null,
        },
        date: "2026-08-06",
        timeWindow: null,
        references: [],
        remarks: null,
      },
    ],
    partialLoadPositions: [],
    legs: [],
    fieldReviews: [],
    snapshot: null,
    auditEvents: [],
  };
}

function makeBundle(overrides?: {
  order?: WorkingTransportOrder;
  includeKm?: boolean;
  originalPdfBytes?: Uint8Array | null;
}): ExportOrderBundle {
  const order = overrides?.order ?? makeOrder();
  return {
    order,
    kmComparison:
      overrides?.includeKm === false
        ? null
        : {
            orderId: order.header.orderId,
            paidKm: 310,
            paidKmExtracted: 300,
            paidKmManual: 310,
            actualKm: 290,
            actualKmCalculated: 290,
            actualKmManual: null,
            directKm: null,
            deltaKm: 20,
            deltaPercent: 6.9,
            status: "warning",
            source: "manual",
            routeUrl: "https://www.google.com/maps/dir/Hamburg/Muenchen",
            routeUrlAuto: "https://www.google.com/maps/dir/Hamburg/Muenchen",
            manualRouteUrl: null,
            corridorId: null,
            errorMessage: null,
          },
    originalPdfBytes: overrides?.originalPdfBytes ?? null,
  };
}

describe("export filters", () => {
  it("derives status", () => {
    expect(deriveOrderExportStatus(makeOrder())).toBe("confirmed");
    expect(
      deriveOrderExportStatus(
        makeOrder({ reviewCompletedAt: "2026-08-05T15:00:00.000Z" }),
      ),
    ).toBe("completed");
    expect(
      deriveOrderExportStatus(
        makeOrder({ stopOrderReviewStatus: "pending_review" }),
      ),
    ).toBe("pending");
  });

  it("respects date, status, dispatcher filters", () => {
    const bundle = makeBundle({
      order: makeOrder({
        responsibleClerk: "Dispatcher A",
        updatedAt: "2026-08-05T12:00:00.000Z",
        reviewCompletedAt: "2026-08-05T15:00:00.000Z",
      }),
    });
    expect(orderMatchesFilters(bundle, { status: "completed" })).toBe(true);
    expect(orderMatchesFilters(bundle, { status: "pending" })).toBe(false);
    expect(orderMatchesFilters(bundle, { dispatcherId: "Dispatcher A" })).toBe(
      true,
    );
    expect(orderMatchesFilters(bundle, { dispatcherId: "Other" })).toBe(false);
    expect(orderMatchesFilters(bundle, { dateFrom: "2026-08-06" })).toBe(false);
    expect(
      orderMatchesFilters(bundle, {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-10",
      }),
    ).toBe(true);
  });
});

describe("exportToExcel", () => {
  it("returns valid xlsx with three sheets", async () => {
    const bytes = await exportToExcel([makeBundle()], {
      includeKmComparison: true,
      includeStops: true,
    });
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Uint8Array.from(bytes) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual([
      "Orders",
      "Stops",
      "KM Comparison",
    ]);
    expect(wb.getWorksheet("Orders")?.rowCount).toBeGreaterThan(1);
    expect(wb.getWorksheet("Stops")?.rowCount).toBeGreaterThan(1);
    expect(wb.getWorksheet("KM Comparison")?.rowCount).toBeGreaterThan(1);
  });

  it("omits stops / km sheets when disabled", async () => {
    const bytes = await exportToExcel([makeBundle()], {
      includeKmComparison: false,
      includeStops: false,
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Uint8Array.from(bytes) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual(["Orders"]);
  });
});

describe("exportToPdf", () => {
  it("returns valid pdf with overview + per-order pages", async () => {
    const bytes = await exportToPdf(
      [makeBundle(), makeBundle({ order: makeOrder({ orderId: "order-2" }) })],
      {},
    );
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it("includes original PDF pages when provided", async () => {
    const original = await PDFDocument.create();
    original.addPage([300, 300]);
    const originalBytes = await original.save();
    const bytes = await exportToPdf(
      [makeBundle({ originalPdfBytes: originalBytes })],
      { includeOriginalPdf: true },
    );
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it("excludes original PDF when unchecked", async () => {
    const original = await PDFDocument.create();
    original.addPage([300, 300]);
    const originalBytes = await original.save();
    const without = await exportToPdf(
      [makeBundle({ originalPdfBytes: originalBytes })],
      { includeOriginalPdf: false },
    );
    const withFlag = await exportToPdf(
      [makeBundle({ originalPdfBytes: originalBytes })],
      { includeOriginalPdf: true },
    );
    const pagesWithout = (await PDFDocument.load(without)).getPageCount();
    const pagesWith = (await PDFDocument.load(withFlag)).getPageCount();
    expect(pagesWith).toBeGreaterThan(pagesWithout);
  });
});

describe("runExport auth", () => {
  it("rejects unauthenticated", async () => {
    const result = await runExport({
      auth: { code: "UNAUTHENTICATED", message: "x", httpStatus: 401 },
      format: "excel",
      filters: {},
      loadBundles: async () => [],
    });
    expect(isAppError(result)).toBe(true);
    if (isAppError(result)) expect(result.httpStatus).toBe(401);
  });

  it("allows viewer / admin / manager with mock bundles", async () => {
    for (const role of ["viewer", "admin", "manager"] as const) {
      const result = await runExport({
        auth: { userId: "u1", role },
        format: "excel",
        filters: {},
        loadBundles: async () => [makeBundle()],
      });
      expect(isAppError(result)).toBe(false);
      if (!isAppError(result)) {
        expect(result.contentType).toContain("spreadsheetml");
        expect(result.filename).toMatch(/\.xlsx$/);
      }
    }
  });

  it("authorizeExport passes through auth errors", () => {
    const denied = authorizeExport({
      code: "FORBIDDEN",
      message: "no",
      httpStatus: 403,
    });
    expect(isAppError(denied)).toBe(true);
  });

  it("buildExportFilename uses date stamp", () => {
    expect(buildExportFilename("excel", "2026-08-06")).toBe(
      "transport-orders-2026-08-06.xlsx",
    );
    expect(buildExportFilename("pdf", "2026-08-06")).toBe(
      "transport-orders-2026-08-06.pdf",
    );
  });

  it("does not call live AI during export", async () => {
    const fetchSpy = vi.fn();
    const previous = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      await runExport({
        auth: { userId: "u1", role: "viewer" },
        format: "pdf",
        filters: {},
        loadBundles: async () => [makeBundle()],
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previous;
    }
  });
});
