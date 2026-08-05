import {
  parseRoleFromAppMetadata,
  type AppRole,
  canManageMasterData,
  canReviewTransportOrders,
} from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { appError, type AppError } from "@/lib/assignments/errors";

export type AuthContext = {
  userId: string;
  role: AppRole;
};

export async function requireAuthenticated(): Promise<AuthContext | AppError> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return appError("UNAUTHENTICATED", "Authentication required.");
  }
  const role = parseRoleFromAppMetadata(
    data.user.app_metadata as Record<string, unknown>,
  );
  if (!role) {
    return appError("FORBIDDEN", "Missing or invalid app_metadata.role.");
  }
  return { userId: data.user.id, role };
}

export async function requireAdmin(): Promise<AuthContext | AppError> {
  const auth = await requireAuthenticated();
  if ("code" in auth) {
    return auth;
  }
  if (!canManageMasterData(auth.role)) {
    return appError("FORBIDDEN", "Admin role required for write operations.");
  }
  return auth;
}

/** PACK-006 writes: admin or manager (not a new dispatcher role). */
export async function requireAdminOrManager(): Promise<AuthContext | AppError> {
  const auth = await requireAuthenticated();
  if ("code" in auth) {
    return auth;
  }
  if (!canReviewTransportOrders(auth.role)) {
    return appError("FORBIDDEN", "Admin or manager role required for transport-order review.");
  }
  return auth;
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "httpStatus" in value &&
    "message" in value
  );
}
