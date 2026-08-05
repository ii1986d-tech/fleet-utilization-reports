import { describe, expect, it, vi } from "vitest";
import {
  assertLocalProvisionGuards,
  assertNoSecretsInOutput,
  formatProvisionResultLine,
  isLocalLoopbackHttpUrl,
  looksLikePlaceholder,
  mergeAppMetadataRole,
  normalizeEmail,
  provisionRoleUser,
  type Pack006AuthAdminClient,
  type Pack006RoleSpec,
} from "../../scripts/pack006-evidence/provision-local-users.mjs";

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    PACK006_NON_PRODUCTION_CONFIRMED: "true",
    PACK006_TARGET: "local",
    PACK006_SUPABASE_URL: "http://127.0.0.1:54321",
    PACK006_ADMIN_EMAIL: "admin@local.test",
    PACK006_ADMIN_PASSWORD: "admin-pass-ok",
    PACK006_MANAGER_EMAIL: "manager@local.test",
    PACK006_MANAGER_PASSWORD: "manager-pass-ok",
    PACK006_VIEWER_EMAIL: "viewer@local.test",
    PACK006_VIEWER_PASSWORD: "viewer-pass-ok",
    ...overrides,
  };
}

describe("PACK-006 local Auth user provisioner guards", () => {
  it("accepts only loopback http URLs", () => {
    expect(isLocalLoopbackHttpUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalLoopbackHttpUrl("http://localhost:54321")).toBe(true);
    expect(isLocalLoopbackHttpUrl("https://127.0.0.1:54321")).toBe(false);
    expect(isLocalLoopbackHttpUrl("http://supabase.co")).toBe(false);
    expect(isLocalLoopbackHttpUrl("https://xyz.supabase.co")).toBe(false);
    expect(isLocalLoopbackHttpUrl("not-a-url")).toBe(false);
  });

  it("aborts when target is not local even with destructive reset enabled", () => {
    expect(() =>
      assertLocalProvisionGuards(
        baseEnv({
          PACK006_TARGET: "remote",
          PACK006_ALLOW_DESTRUCTIVE_TEST_PROJECT_RESET: "true",
          PACK006_SUPABASE_URL: "https://xyz.supabase.co",
        }),
      ),
    ).toThrow(/local-only/i);
  });

  it("aborts on non-loopback URL even when target=local", () => {
    expect(() =>
      assertLocalProvisionGuards(
        baseEnv({ PACK006_SUPABASE_URL: "https://xyz.supabase.co" }),
      ),
    ).toThrow(/loopback/i);
  });

  it("aborts when non-production confirmation is missing", () => {
    expect(() =>
      assertLocalProvisionGuards(baseEnv({ PACK006_NON_PRODUCTION_CONFIRMED: "false" })),
    ).toThrow(/NON_PRODUCTION/i);
  });

  it("aborts on missing credentials", () => {
    expect(() =>
      assertLocalProvisionGuards(baseEnv({ PACK006_ADMIN_PASSWORD: "" })),
    ).toThrow(/missing PACK006_ADMIN/);
  });

  it("aborts on placeholder credentials", () => {
    expect(() =>
      assertLocalProvisionGuards(baseEnv({ PACK006_ADMIN_PASSWORD: "changeme" })),
    ).toThrow(/placeholder/i);
    expect(() =>
      assertLocalProvisionGuards(baseEnv({ PACK006_VIEWER_EMAIL: "example@example.com" })),
    ).toThrow(/placeholder/i);
    expect(looksLikePlaceholder("REPLACE_ME_PASSWORD")).toBe(true);
    expect(looksLikePlaceholder("real-enough-secret")).toBe(false);
  });

  it("enforces distinct emails after normalization", () => {
    expect(() =>
      assertLocalProvisionGuards(
        baseEnv({
          PACK006_ADMIN_EMAIL: "Same@Local.Test",
          PACK006_MANAGER_EMAIL: "same@local.test",
        }),
      ),
    ).toThrow(/distinct/i);
  });

  it("returns exact role → email mapping", () => {
    const { roles } = assertLocalProvisionGuards(
      baseEnv({
        PACK006_ADMIN_EMAIL: " Admin@Local.Test ",
        PACK006_MANAGER_EMAIL: "Manager@Local.Test",
        PACK006_VIEWER_EMAIL: "viewer@local.test",
      }),
    );
    expect(roles.map((r: Pack006RoleSpec) => r.role)).toEqual(["admin", "manager", "viewer"]);
    expect(roles.map((r: Pack006RoleSpec) => r.email)).toEqual([
      "admin@local.test",
      "manager@local.test",
      "viewer@local.test",
    ]);
    expect(normalizeEmail("  X@Y.COM ")).toBe("x@y.com");
  });
});

describe("PACK-006 local Auth user provisioner behavior", () => {
  it("stores roles only via app_metadata merge and preserves unrelated keys", () => {
    expect(mergeAppMetadataRole(undefined, "admin")).toEqual({ role: "admin" });
    expect(mergeAppMetadataRole({ provider: "email", team: "ops" }, "manager")).toEqual({
      provider: "email",
      team: "ops",
      role: "manager",
    });
    expect(mergeAppMetadataRole({ role: "viewer", note: "keep" }, "admin")).toEqual({
      role: "admin",
      note: "keep",
    });
  });

  it("creates absent users and updates existing ones idempotently without duplicates", async () => {
    const store = new Map<
      string,
      {
        id: string;
        email: string;
        app_metadata: Record<string, unknown>;
        user_metadata: Record<string, unknown>;
      }
    >();

    const admin: Pack006AuthAdminClient = {
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: [...store.values()] },
            error: null,
          })),
          createUser: vi.fn(
            async (payload: {
              email: string;
              password: string;
              email_confirm: boolean;
              app_metadata: Record<string, unknown>;
            }) => {
              const id = `id-${store.size + 1}`;
              const user = {
                id,
                email: payload.email,
                app_metadata: { ...payload.app_metadata },
                user_metadata: {},
              };
              store.set(id, user);
              expect(payload.email_confirm).toBe(true);
              expect(payload.password.length).toBeGreaterThan(0);
              expect(Object.prototype.hasOwnProperty.call(payload, "user_metadata")).toBe(false);
              return { data: { user }, error: null };
            },
          ),
          updateUserById: vi.fn(
            async (
              id: string,
              payload: {
                password: string;
                email_confirm: boolean;
                app_metadata: Record<string, unknown>;
              },
            ) => {
              const prev = store.get(id);
              if (!prev) return { data: { user: null }, error: { message: "missing" } };
              const user = {
                ...prev,
                app_metadata: { ...payload.app_metadata },
              };
              store.set(id, user);
              expect(payload.email_confirm).toBe(true);
              return { data: { user }, error: null };
            },
          ),
          getUserById: vi.fn(async (id: string) => {
            const user = store.get(id);
            return { data: { user: user ?? null }, error: user ? null : { message: "missing" } };
          }),
        },
      },
    };

    const created = await provisionRoleUser(admin, {
      role: "admin",
      email: "admin@local.test",
      password: "admin-pass-ok",
    });
    expect(created.action).toBe("created");
    expect(created.verified).toBe(true);
    expect(store.size).toBe(1);
    expect([...store.values()][0].app_metadata).toEqual({ role: "admin" });

    // Seed unrelated app_metadata, then update
    const existingId = [...store.keys()][0];
    store.set(existingId, {
      ...store.get(existingId)!,
      app_metadata: { role: "stale", provider: "email", custom: 1 },
    });

    const updated = await provisionRoleUser(admin, {
      role: "admin",
      email: "admin@local.test",
      password: "admin-pass-ok-2",
    });
    expect(updated.action).toBe("updated");
    expect(store.size).toBe(1);
    expect(store.get(existingId)!.app_metadata).toEqual({
      role: "admin",
      provider: "email",
      custom: 1,
    });
    expect(admin.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it("formats safe output without secrets", () => {
    const line = formatProvisionResultLine({
      action: "updated",
      email: "admin@local.test",
      role: "admin",
      verified: true,
    });
    expect(line).toContain("updated");
    expect(line).toContain("verified=true");
    expect(line).toContain("role=admin");
    expect(line).toContain("admin@local.test");
    expect(() => assertNoSecretsInOutput(line)).not.toThrow();
    expect(() =>
      assertNoSecretsInOutput("token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"),
    ).toThrow(/JWT/i);
    expect(() => assertNoSecretsInOutput("SERVICE_ROLE leaked")).toThrow(/secret/i);
  });
});
