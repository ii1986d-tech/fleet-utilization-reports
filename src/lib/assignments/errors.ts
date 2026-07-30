export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ASSIGNMENT_OVERLAP"
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
      return 400;
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "ASSIGNMENT_OVERLAP":
      return 409;
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
  const message = err instanceof Error ? err.message : String(err);
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
