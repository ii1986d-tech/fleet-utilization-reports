import ExcelJS from "exceljs";
import { escapeExcelFormula } from "@/lib/imports/assignments/report";
import {
  deriveOrderExportStatus,
  normalizeExportFilters,
  type ExportFilters,
  type ExportOrderBundle,
} from "@/lib/export/types";

function cell(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return escapeExcelFormula(String(value));
}

export async function exportToExcel(
  bundles: ExportOrderBundle[],
  filters: ExportFilters,
): Promise<Buffer> {
  const opts = normalizeExportFilters(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "fleet-utilization-reports";
  workbook.created = new Date();

  const ordersSheet = workbook.addWorksheet("Orders");
  ordersSheet.addRow([
    "Order ID",
    "Tour Number",
    "Business Identifier",
    "Status",
    "Paid KM",
    "Actual KM",
    "Direct KM",
    "Delta KM",
    "Delta %",
    "Freight Amount",
    "Currency",
    "Cargo Weight",
    "Loading Meters",
    "Volume",
    "Truck Plate",
    "Trailer Plate",
    "Responsible Clerk",
    "Created At",
    "Updated At",
  ]);

  for (const bundle of bundles) {
    const h = bundle.order.header;
    const km = bundle.kmComparison;
    ordersSheet.addRow([
      cell(h.orderId),
      cell(h.tourNumber),
      cell(h.businessIdentifier),
      cell(deriveOrderExportStatus(bundle.order)),
      cell(km?.paidKm ?? h.paidKilometers),
      cell(km?.actualKm ?? null),
      cell(km?.directKm ?? null),
      cell(km?.deltaKm ?? null),
      cell(km?.deltaPercent ?? null),
      cell(h.freight.amount),
      cell(h.freight.currency),
      cell(h.cargoWeightKg),
      cell(h.cargoLoadingMeters),
      cell(h.cargoVolumeM3),
      cell(h.truckLicensePlate),
      cell(h.trailerLicensePlate),
      cell(h.responsibleClerk),
      cell(h.updatedAt),
      cell(h.updatedAt),
    ]);
  }

  if (opts.includeStops) {
    const stopsSheet = workbook.addWorksheet("Stops");
    stopsSheet.addRow([
      "Order ID",
      "Stop Type",
      "Sequence",
      "Company",
      "Street",
      "Postal Code",
      "City",
      "Country",
      "Date",
      "Time Window",
    ]);
    for (const bundle of bundles) {
      const stops = bundle.order.stops
        .slice()
        .sort((a, b) => a.sequence - b.sequence);
      for (const stop of stops) {
        stopsSheet.addRow([
          cell(bundle.order.header.orderId),
          cell(stop.type),
          cell(stop.sequence),
          cell(stop.address.company),
          cell(
            [stop.address.street, stop.address.houseNumber]
              .filter(Boolean)
              .join(" "),
          ),
          cell(stop.address.postalCode),
          cell(stop.address.city),
          cell(stop.address.country),
          cell(stop.date),
          cell(stop.timeWindow),
        ]);
      }
    }
  }

  if (opts.includeKmComparison) {
    const kmSheet = workbook.addWorksheet("KM Comparison");
    kmSheet.addRow([
      "Order ID",
      "Paid KM",
      "Actual KM",
      "Direct KM",
      "Delta KM",
      "Delta %",
      "Status",
      "Source",
      "Route URL",
      "Manual Route URL",
    ]);
    for (const bundle of bundles) {
      const km = bundle.kmComparison;
      kmSheet.addRow([
        cell(bundle.order.header.orderId),
        cell(km?.paidKm ?? null),
        cell(km?.actualKm ?? null),
        cell(km?.directKm ?? null),
        cell(km?.deltaKm ?? null),
        cell(km?.deltaPercent ?? null),
        cell(km?.status ?? null),
        cell(km?.source ?? null),
        cell(km?.routeUrlAuto ?? km?.routeUrl ?? null),
        cell(km?.manualRouteUrl ?? null),
      ]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
