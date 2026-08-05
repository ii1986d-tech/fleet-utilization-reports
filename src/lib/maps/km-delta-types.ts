export type KmDeltaStatus = "ok" | "warning" | "error";

export type KmDeltaSource = "api" | "cache" | "fallback" | "manual";

export type KmComparisonResult = {
  orderId: string;
  paidKm: number | null;
  paidKmExtracted: number | null;
  paidKmManual: number | null;
  actualKm: number | null;
  actualKmCalculated: number | null;
  actualKmManual: number | null;
  directKm: number | null;
  deltaKm: number | null;
  deltaPercent: number | null;
  status: KmDeltaStatus;
  source: KmDeltaSource;
  routeUrl: string | null;
  routeUrlAuto: string | null;
  manualRouteUrl: string | null;
  errorMessage: string | null;
};

export type ManualOverride = {
  paidKmManual?: number | null;
  actualKmManual?: number | null;
  manualRouteUrl?: string | null;
};

export type KmComparisonRow = {
  id: string;
  orderId: string;
  paidKm: number | null;
  paidKmManual: number | null;
  actualKm: number | null;
  actualKmManual: number | null;
  directKm: number | null;
  deltaKm: number | null;
  deltaPercent: number | null;
  status: KmDeltaStatus;
  source: KmDeltaSource;
  routeUrl: string | null;
  manualRouteUrl: string | null;
  effectiveRouteUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KmDeltaErrorCode =
  | "ORDER_NOT_FOUND"
  | "KM_COMPARISON_NOT_FOUND"
  | "DATABASE_WRITE_FAILED"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR";

export type KmDeltaError = {
  code: KmDeltaErrorCode;
  message: string;
  httpStatus: number;
};

export function kmDeltaError(
  code: KmDeltaErrorCode,
  message: string,
): KmDeltaError {
  const httpStatus = (() => {
    switch (code) {
      case "VALIDATION_ERROR":
        return 400;
      case "UNAUTHENTICATED":
        return 401;
      case "FORBIDDEN":
        return 403;
      case "ORDER_NOT_FOUND":
      case "KM_COMPARISON_NOT_FOUND":
        return 404;
      case "DATABASE_WRITE_FAILED":
        return 500;
      default: {
        const _exhaustive: never = code;
        return _exhaustive;
      }
    }
  })();
  return { code, message, httpStatus };
}

export function isKmDeltaError(value: unknown): value is KmDeltaError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    "message" in value
  );
}
