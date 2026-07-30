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
      return 409;
    case "IMPORT_FILE_TOO_LARGE":
      return 413;
    case "IMPORT_VALIDATION_FAILED":
      return 422;
    case "INTERNAL_ERROR":
      return 500;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

/** Map Postgres exclusion / unique violations to ASSIGNMENT_OVERLAP when applicable. */
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
  return appError("INTERNAL_ERROR", "Database operation failed.");
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
