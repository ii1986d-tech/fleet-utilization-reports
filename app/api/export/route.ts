import { NextResponse } from "next/server";
import { isAppError, requireAuthenticated } from "@/lib/auth/session";
import {
  runExport,
  type ExportRequestBody,
} from "@/lib/export/export-service";
import type { ExportFormat } from "@/lib/export/types";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }

  let body: ExportRequestBody;
  try {
    body = (await request.json()) as ExportRequestBody;
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const format = body.format as ExportFormat;
  if (format !== "excel" && format !== "pdf") {
    return jsonError("VALIDATION_ERROR", "format must be excel or pdf.", 400);
  }

  const result = await runExport({
    auth,
    format,
    filters: {
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      status: body.status,
      dispatcherId: body.dispatcherId,
      includeKmComparison: body.includeKmComparison,
      includeStops: body.includeStops,
      includeOriginalPdf: body.includeOriginalPdf,
    },
  });

  if (isAppError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }

  return new NextResponse(new Uint8Array(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
