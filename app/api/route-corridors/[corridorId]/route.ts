import { NextResponse } from "next/server";
import { isAppError, requireAdmin } from "@/lib/auth/session";
import {
  deactivateCorridor,
  updateCorridor,
} from "@/lib/maps/corridor-service";
import {
  isCorridorError,
  type CorridorWriteInput,
} from "@/lib/maps/corridor-types";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ corridorId: string }> },
) {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }

  const { corridorId } = await context.params;
  let body: Partial<CorridorWriteInput> & { deactivate?: boolean };
  try {
    body = (await request.json()) as Partial<CorridorWriteInput> & {
      deactivate?: boolean;
    };
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const result = body.deactivate
    ? await deactivateCorridor(corridorId, { actorRole: auth.role })
    : await updateCorridor(corridorId, body, { actorRole: auth.role });

  if (isCorridorError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  return NextResponse.json(result);
}
