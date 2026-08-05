/**
 * Ambient wildcard module for the PACK-006 local Auth provisioner (.mjs).
 * Matches imports ending in provision-local-users.mjs without enabling project-wide allowJs.
 */
declare module "*provision-local-users.mjs" {
  export type Pack006ProvisionRole = "admin" | "manager" | "viewer";

  export type Pack006RoleSpec = {
    role: Pack006ProvisionRole;
    email: string;
    password: string;
  };

  export type Pack006ProvisionResult = {
    action: "created" | "updated";
    email: string;
    role: string;
    verified: true;
  };

  export type Pack006AuthAdminClient = {
    auth: {
      admin: {
        listUsers: (params: {
          page: number;
          perPage: number;
        }) => Promise<{ data: { users: Array<Record<string, unknown>> }; error: unknown }>;
        createUser: (payload: {
          email: string;
          password: string;
          email_confirm: boolean;
          app_metadata: Record<string, unknown>;
        }) => Promise<{ data: { user: Record<string, unknown> | null }; error: unknown }>;
        updateUserById: (
          id: string,
          payload: {
            password: string;
            email_confirm: boolean;
            app_metadata: Record<string, unknown>;
          },
        ) => Promise<{ data: { user: Record<string, unknown> | null }; error: unknown }>;
        getUserById: (
          id: string,
        ) => Promise<{ data: { user: Record<string, unknown> | null }; error: unknown }>;
      };
    };
  };

  export const ROLES: readonly Pack006ProvisionRole[];

  export function normalizeEmail(email: string): string;
  export function looksLikePlaceholder(value: string): boolean;
  export function isLocalLoopbackHttpUrl(url: string): boolean;
  export function assertLocalProvisionGuards(env: Record<string, string>): {
    roles: Pack006RoleSpec[];
  };
  export function findUserByEmail(
    admin: Pack006AuthAdminClient,
    email: string,
  ): Promise<Record<string, unknown> | null>;
  export function mergeAppMetadataRole(
    existing: Record<string, unknown> | undefined,
    role: string,
  ): Record<string, unknown>;
  export function assertVerifiedUser(
    user: Record<string, unknown>,
    expectedRole: string,
    expectedEmail: string,
  ): void;
  export function provisionRoleUser(
    admin: Pack006AuthAdminClient,
    spec: Pack006RoleSpec,
  ): Promise<Pack006ProvisionResult>;
  export function formatProvisionResultLine(result: {
    action: string;
    email: string;
    role: string;
    verified: boolean;
  }): string;
  export function assertNoSecretsInOutput(text: string): void;
}
