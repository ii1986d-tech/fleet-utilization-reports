export type RouteCorridor = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: string[];
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CorridorWriteInput = {
  name: string;
  origin: string;
  destination: string;
  waypoints?: string[];
  description?: string | null;
  active?: boolean;
};

export type CorridorErrorCode =
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "DATABASE_WRITE_FAILED";

export type CorridorError = {
  code: CorridorErrorCode;
  message: string;
  httpStatus: number;
};

export function corridorError(
  code: CorridorErrorCode,
  message: string,
): CorridorError {
  const httpStatus = (() => {
    switch (code) {
      case "VALIDATION_ERROR":
        return 400;
      case "UNAUTHENTICATED":
        return 401;
      case "FORBIDDEN":
        return 403;
      case "NOT_FOUND":
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

export function isCorridorError(value: unknown): value is CorridorError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    "message" in value
  );
}
