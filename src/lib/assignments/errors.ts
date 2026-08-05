export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ASSIGNMENT_OVERLAP"
  | "IMPORT_ALREADY_CONFIRMED"
  | "IMPORT_FILE_INVALID"
  | "IMPORT_FILE_TOO_LARGE"
  | "IMPORT_VALIDATION_FAILED"
  | "ORDER_VERSION_CONFLICT"
  | "ORDER_REVIEW_INCOMPLETE"
  | "IDEMPOTENCY_KEY_REUSE_MISMATCH"
  | "INVALID_STOP_REFERENCE"
  | "INVALID_PDF"
  | "EXTRACTION_FAILED"
  | "CONFIGURATION_ERROR"
  | "INTERNAL_ERROR";

export type AppError = {
  code: AppErrorCode;
  message: string;
  httpStatus: number;
  details?: Record<string, unknown>;
};

export function appError(
  code: AppErrorCode,
  message: string,
  details?: Record<string, unknown>,
): AppError {
  const httpStatus = statusForCode(code);
  return details ? { code, message, httpStatus, details } : { code, message, httpStatus };
}

function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "IMPORT_FILE_INVALID":
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "ASSIGNMENT_OVERLAP":
    case "IMPORT_ALREADY_CONFIRMED":
    case "ORDER_VERSION_CONFLICT":
    case "ORDER_REVIEW_INCOMPLETE":
    case "IDEMPOTENCY_KEY_REUSE_MISMATCH":
      return 409;
    case "INVALID_STOP_REFERENCE":
    case "INVALID_PDF":
      return 400;
    case "EXTRACTION_FAILED":
      return 422;
    case "IMPORT_FILE_TOO_LARGE":
      return 413;
    case "IMPORT_VALIDATION_FAILED":
      return 422;
    case "CONFIGURATION_ERROR":
      return 503;
    case "INTERNAL_ERROR":
      return 500;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

/** Map Postgres exclusion / unique violations and PACK-006 RPC codes. */
export function mapDatabaseError(err: unknown): AppError {
  const message = extractErrorMessage(err);
  const lower = message.toLowerCase();
  if (
    lower.includes("vehicle_assignments_vehicle_period_excl") ||
    lower.includes("exclusion") ||
    lower.includes("23p01") ||
    lower.includes("conflicting key value violates exclusion")
  ) {
    return appError(
      "ASSIGNMENT_OVERLAP",
      "Assignment period overlaps an existing assignment for this vehicle.",
    );
  }
  if (message.includes("ORDER_VERSION_CONFLICT")) {
    return appError("ORDER_VERSION_CONFLICT", "Stale order version; reload and retry.");
  }
  if (message.includes("ORDER_REVIEW_INCOMPLETE")) {
    const unresolved = parseUnresolvedFromRpcMessage(message);
    return appError("ORDER_REVIEW_INCOMPLETE", "Order review is incomplete.", {
      unresolved,
    });
  }
  if (message.includes("IDEMPOTENCY_KEY_REUSE_MISMATCH")) {
    return appError(
      "IDEMPOTENCY_KEY_REUSE_MISMATCH",
      "Idempotency key reused with different payload.",
    );
  }
  if (message.includes("INVALID_STOP_REFERENCE")) {
    return appError("INVALID_STOP_REFERENCE", "Invalid stop reference.");
  }
  if (message.includes("FORBIDDEN")) {
    return appError("FORBIDDEN", "Not allowed.");
  }
  if (message.includes("UNAUTHENTICATED")) {
    return appError("UNAUTHENTICATED", "Authentication required.");
  }
  if (message.includes("NOT_FOUND")) {
    return appError("NOT_FOUND", "Not found.");
  }
  if (message.includes("EXTRACTION_FAILED")) {
    return appError("EXTRACTION_FAILED", "Extraction failed.");
  }
  if (message.includes("VALIDATION_ERROR")) {
    return appError("VALIDATION_ERROR", "Validation failed.");
  }
  if (message.includes("IMMUTABLE_EXTRACTION_SNAPSHOT")) {
    return appError("VALIDATION_ERROR", "Extraction snapshot is immutable.");
  }
  return appError("INTERNAL_ERROR", "Database operation failed.");
}

function parseUnresolvedFromRpcMessage(message: string): unknown[] {
  const marker = "ORDER_REVIEW_INCOMPLETE:";
  const idx = message.indexOf(marker);
  if (idx < 0) return [];
  const jsonPart = message.slice(idx + marker.length).trim();
  try {
    const parsed: unknown = JSON.parse(jsonPart);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
