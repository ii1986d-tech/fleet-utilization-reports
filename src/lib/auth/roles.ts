export const APP_ROLES = ["admin", "manager", "viewer"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Role claim path for JWT / app_metadata.
 * RLS policies read: auth.jwt() -> 'app_metadata' ->> 'role'
 */
export const ROLE_CLAIM_PATH = "app_metadata.role" as const;

export function parseRoleFromAppMetadata(
  appMetadata: Record<string, unknown> | null | undefined,
): AppRole | null {
  if (!appMetadata) {
    return null;
  }
  const role = appMetadata.role;
  return isAppRole(role) ? role : null;
}

export function canManageMasterData(role: AppRole): boolean {
  return role === "admin";
}

/** PACK-006: admin + manager may upload/review/confirm/reorder transport orders. */
export function canReviewTransportOrders(role: AppRole): boolean {
  switch (role) {
    case "admin":
    case "manager":
      return true;
    case "viewer":
      return false;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function canUploadTransportOrders(role: AppRole): boolean {
  return canReviewTransportOrders(role);
}

export function canReadTransportOrders(role: AppRole): boolean {
  switch (role) {
    case "admin":
    case "manager":
    case "viewer":
      return true;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function canReadReports(role: AppRole): boolean {
  switch (role) {
    case "admin":
    case "manager":
    case "viewer":
      return true;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
