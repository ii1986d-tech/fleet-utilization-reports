import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSPORT_ORDER_ALLOW_MEMORY_ENV,
  TRANSPORT_ORDER_STORE_ENV,
  createTransportOrderStore,
} from "@/lib/transport-orders/store/factory";
import { MemoryTransportOrderStore } from "@/lib/transport-orders/store/memory";
import { SupabaseTransportOrderStore } from "@/lib/transport-orders/store/supabase";

describe("PACK-006 store factory fail-closed selection", () => {
  const prevStore = process.env[TRANSPORT_ORDER_STORE_ENV];
  const prevAllow = process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV];

  afterEach(() => {
    if (prevStore === undefined) delete process.env[TRANSPORT_ORDER_STORE_ENV];
    else process.env[TRANSPORT_ORDER_STORE_ENV] = prevStore;
    if (prevAllow === undefined) delete process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV];
    else process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV] = prevAllow;
  });

  it("defaults to SupabaseTransportOrderStore", () => {
    delete process.env[TRANSPORT_ORDER_STORE_ENV];
    delete process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV];
    const store = createTransportOrderStore();
    expect(store).toBeInstanceOf(SupabaseTransportOrderStore);
  });

  it("rejects memory without explicit allow flag", () => {
    process.env[TRANSPORT_ORDER_STORE_ENV] = "memory";
    delete process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV];
    expect(() => createTransportOrderStore()).toThrow(/TRANSPORT_ORDER_ALLOW_MEMORY_STORE=1/);
  });

  it("allows memory only with explicit test flag", () => {
    process.env[TRANSPORT_ORDER_STORE_ENV] = "memory";
    process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV] = "1";
    const store = createTransportOrderStore();
    expect(store).toBeInstanceOf(MemoryTransportOrderStore);
  });
});
