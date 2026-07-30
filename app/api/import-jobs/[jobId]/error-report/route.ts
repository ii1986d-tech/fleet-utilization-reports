import { NextResponse } from "next/server";
import { downloadImportErrorReport } from "@/lib/imports/assignments/actions";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const result = await downloadImportErrorReport({ jobId });
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.error.code,
        message: result.error.message,
      },
      { status: result.error.httpStatus },
    );
  }

  const bytes = Buffer.from(result.data.bytesBase64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
