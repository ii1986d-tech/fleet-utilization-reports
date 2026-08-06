import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  deriveOrderExportStatus,
  normalizeExportFilters,
  type ExportFilters,
  type ExportOrderBundle,
} from "@/lib/export/types";

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export async function exportToPdf(
  bundles: ExportOrderBundle[],
  filters: ExportFilters,
): Promise<Buffer> {
  const opts = normalizeExportFilters(filters);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: overview table
  let page = doc.addPage([595, 842]); // A4
  let y = 800;
  const draw = (text: string, x: number, size = 10, bold = false) => {
    page.drawText(truncate(text, 90), {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  draw("Transport orders — Overview", 40, 14, true);
  y -= 24;
  draw(
    `Exported ${new Date().toISOString().slice(0, 10)} · ${bundles.length} order(s)`,
    40,
    9,
  );
  y -= 20;
  draw("Order ID", 40, 9, true);
  draw("Tour", 160, 9, true);
  draw("Status", 260, 9, true);
  draw("Paid", 340, 9, true);
  draw("Actual", 400, 9, true);
  draw("Delta", 470, 9, true);
  y -= 14;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 555, y },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 12;

  for (const bundle of bundles) {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    const h = bundle.order.header;
    const km = bundle.kmComparison;
    draw(truncate(h.orderId, 18), 40, 8);
    draw(truncate(fmt(h.tourNumber), 14), 160, 8);
    draw(deriveOrderExportStatus(bundle.order), 260, 8);
    draw(fmt(km?.paidKm ?? h.paidKilometers), 340, 8);
    draw(fmt(km?.actualKm), 400, 8);
    draw(fmt(km?.deltaKm), 470, 8);
    y -= 12;
  }

  // Per-order summaries
  for (const bundle of bundles) {
    page = doc.addPage([595, 842]);
    y = 800;
    const h = bundle.order.header;
    const km = bundle.kmComparison;

    const drawLine = (label: string, value: unknown) => {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(truncate(`${label}: ${fmt(value)}`, 95), {
        x: 40,
        y,
        size: 10,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 14;
    };

    page.drawText("Order summary", {
      x: 40,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;
    drawLine("Order ID", h.orderId);
    drawLine("Tour Number", h.tourNumber);
    drawLine("Business Identifier", h.businessIdentifier);
    drawLine("Status", deriveOrderExportStatus(bundle.order));
    drawLine("Freight", `${fmt(h.freight.amount)} ${fmt(h.freight.currency)}`);
    drawLine("Paid KM (header)", h.paidKilometers);
    drawLine("Truck / Trailer", `${fmt(h.truckLicensePlate)} / ${fmt(h.trailerLicensePlate)}`);
    drawLine("Responsible Clerk", h.responsibleClerk);
    drawLine("Cargo", `${fmt(h.cargoWeightKg)} kg · ${fmt(h.cargoLoadingMeters)} m · ${fmt(h.cargoVolumeM3)} m³`);
    drawLine("Updated At", h.updatedAt);

    if (opts.includeStops) {
      y -= 8;
      page.drawText("Stops", {
        x: 40,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 16;
      const stops = bundle.order.stops.slice().sort((a, b) => a.sequence - b.sequence);
      for (const stop of stops) {
        drawLine(
          `#${stop.sequence} ${stop.type}`,
          [
            stop.address.company,
            stop.address.street,
            stop.address.postalCode,
            stop.address.city,
            stop.address.country,
            stop.date,
          ]
            .filter(Boolean)
            .join(", "),
        );
      }
    }

    if (opts.includeKmComparison) {
      y -= 8;
      page.drawText("KM comparison", {
        x: 40,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 16;
      drawLine("Paid KM", km?.paidKm);
      drawLine("Actual KM", km?.actualKm);
      drawLine("Direct KM", km?.directKm);
      drawLine("Delta KM", km?.deltaKm);
      drawLine("Delta %", km?.deltaPercent);
      drawLine("KM Status", km?.status);
      drawLine("Source", km?.source);
      drawLine("Route URL", km?.routeUrl);
    }

    if (opts.includeOriginalPdf && bundle.originalPdfBytes?.length) {
      try {
        const original = await PDFDocument.load(bundle.originalPdfBytes, {
          ignoreEncryption: true,
        });
        const pages = await doc.copyPages(original, original.getPageIndices());
        for (const p of pages) doc.addPage(p);
      } catch {
        // Safe skip — never dump PDF bytes or secrets
        console.warn("[export] original_pdf_attach_failed");
      }
    }
  }

  if (bundles.length === 0) {
    // keep overview-only empty file meaningful
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
