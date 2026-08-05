import { NextResponse } from "next/server";
import {
  canReadTransportOrders,
  canReviewTransportOrders,
} from "@/lib/auth/roles";
import {
  isAppError,
  requireAdminOrManager,
  requireAuthenticated,
} from "@/lib/auth/session";
import {
  calculateKmDelta,
  getKmComparison,
  setManualOverride,
} from "@/lib/maps/km-delta-service";
import {
  isKmDeltaError,
  type ManualOverride,
} from "@/lib/maps/km-delta-types";
import { getTransportOrderStore } from "@/lib/transport-orders/store/factory";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireAuthenticated();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }
  if (!canReadTransportOrders(auth.role)) {
    return jsonError("FORBIDDEN", "Not allowed to read KM comparison.", 403);
  }

  const { orderId } = await context.params;
  const result = await getKmComparison(orderId);
  if (isKmDeltaError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  if (!result) {
    return jsonError("KM_COMPARISON_NOT_FOUND", "KM comparison not found.", 404);
  }
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }
  if (!canReviewTransportOrders(auth.role)) {
    return jsonError("FORBIDDEN", "Admin or manager role required.", 403);
  }

  const { orderId } = await context.params;
  let corridorId: string | null | undefined;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { corridorId?: string | null };
      corridorId = body.corridorId;
    }
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const result = await calculateKmDelta(orderId, {
    orderLoader: getTransportOrderStore(),
    corridorId: corridorId === undefined ? undefined : corridorId,
  });
  if (isKmDeltaError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  return NextResponse.json(result);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const auth = await requireAdminOrManager();
  if (isAppError(auth)) {
    return jsonError(auth.code, auth.message, auth.httpStatus);
  }

  const { orderId } = await context.params;
  let body: ManualOverride;
  try {
    body = (await request.json()) as ManualOverride;
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid JSON body.", 400);
  }

  const result = await setManualOverride(orderId, body, {
    actorRole: auth.role,
  });
  if (isKmDeltaError(result)) {
    return jsonError(result.code, result.message, result.httpStatus);
  }
  return NextResponse.json(result);
}
