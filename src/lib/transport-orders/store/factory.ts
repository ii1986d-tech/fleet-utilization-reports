import { appError, type AppError } from "@/lib/assignments/errors";
import { MemoryTransportOrderStore } from "@/lib/transport-orders/store/memory";
import { SupabaseTransportOrderStore } from "@/lib/transport-orders/store/supabase";
import type { TransportOrderStore } from "@/lib/transport-orders/store/types";

export const TRANSPORT_ORDER_STORE_ENV = "TRANSPORT_ORDER_STORE";
export const TRANSPORT_ORDER_ALLOW_MEMORY_ENV = "TRANSPORT_ORDER_ALLOW_MEMORY_STORE";

const globalForStore = globalThis as unknown as {
  __pack006MemoryStore?: MemoryTransportOrderStore;
};

/**
 * Fail-closed store selection.
 * - Default / production: SupabaseTransportOrderStore
 * - Memory only when TRANSPORT_ORDER_STORE=memory AND TRANSPORT_ORDER_ALLOW_MEMORY_STORE=1
 * - No silent fallback to memory
 */
export function createTransportOrderStore(): TransportOrderStore {
  const mode = (process.env[TRANSPORT_ORDER_STORE_ENV] ?? "supabase").toLowerCase();
  switch (mode) {
    case "supabase":
      return new SupabaseTransportOrderStore();
    case "memory": {
      if (process.env[TRANSPORT_ORDER_ALLOW_MEMORY_ENV] !== "1") {
        throw new Error(
          "Memory transport-order store requires TRANSPORT_ORDER_ALLOW_MEMORY_STORE=1. " +
            "Production must use TRANSPORT_ORDER_STORE=supabase.",
        );
      }
      if (!globalForStore.__pack006MemoryStore) {
        globalForStore.__pack006MemoryStore = new MemoryTransportOrderStore();
      }
      return globalForStore.__pack006MemoryStore;
    }
    default:
      throw new Error(
        `Unknown ${TRANSPORT_ORDER_STORE_ENV}='${mode}'. Allowed: supabase | memory (test-only).`,
      );
  }
}

export function getTransportOrderStore(): TransportOrderStore {
  return createTransportOrderStore();
}

/** Test helper — resets process-local memory store when memory mode is enabled. */
export function resetTransportOrderStoreForTests(): void {
  globalForStore.__pack006MemoryStore = new MemoryTransportOrderStore();
}

export function configurationError(message: string): AppError {
  return appError("CONFIGURATION_ERROR", message);
}
