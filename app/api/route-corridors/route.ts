import { NextResponse } from "next/server";
import { canReadTransportOrders } from "@/lib/auth/roles";
import {
  isAppError,
  requireAdmin,
  requireAuthenticated,
} from "@/lib/auth/session";
import {
  createCorridor,
  listActiveCorridors,
  listAllCorridors,
} from "@/lib/maps/corridor-service";
import {
  isCorridorError,
  type CorridorWriteInput,
} from "@/lib/maps/corridor-types";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function GET(request: Request) {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }
  if (!canReadTransportOrders(auth.role)) {
    return jsonError("FORBIDDEN", "Not allowed to read corridors.", 403);
  }

  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("all") === "1";
  const result =
    includeInactive && auth.role === "admin"
      ? await listAllCorridors()
      : await listActiveCorridors();

  if (isCorridorError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  return NextResponse.json({ corridors: result });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }

  let body: CorridorWriteInput;
  try {
    body = (await request.json()) as CorridorWriteInput;
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const result = await createCorridor(body, { actorRole: auth.role });
  if (isCorridorError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  return NextResponse.json(result, { status: 201 });
}
