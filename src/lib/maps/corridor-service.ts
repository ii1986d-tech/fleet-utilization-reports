import { canManageMasterData, type AppRole } from "@/lib/auth/roles";
import {
  createCorridorStore,
  type CorridorStore,
} from "@/lib/maps/corridor-store";
import {
  corridorError,
  isCorridorError,
  type CorridorError,
  type CorridorWriteInput,
  type RouteCorridor,
} from "@/lib/maps/corridor-types";

export function assertCanWriteCorridors(role: AppRole): CorridorError | null {
  if (!canManageMasterData(role)) {
    return corridorError("FORBIDDEN", "Admin role required to manage corridors.");
  }
  return null;
}

function validateWrite(input: CorridorWriteInput): CorridorError | null {
  if (!input.name?.trim() || !input.origin?.trim() || !input.destination?.trim()) {
    return corridorError(
      "VALIDATION_ERROR",
      "name, origin, and destination are required.",
    );
  }
  return null;
}

export async function listActiveCorridors(
  options: { store?: CorridorStore } = {},
): Promise<RouteCorridor[] | CorridorError> {
  const store = options.store ?? createCorridorStore();
  return store.listActive();
}

export async function listAllCorridors(
  options: { store?: CorridorStore } = {},
): Promise<RouteCorridor[] | CorridorError> {
  const store = options.store ?? createCorridorStore();
  return store.listAll();
}

export async function createCorridor(
  input: CorridorWriteInput,
  options: { store?: CorridorStore; actorRole: AppRole },
): Promise<RouteCorridor | CorridorError> {
  const denied = assertCanWriteCorridors(options.actorRole);
  if (denied) return denied;
  const invalid = validateWrite(input);
  if (invalid) return invalid;
  const store = options.store ?? createCorridorStore();
  return store.create(input);
}

export async function updateCorridor(
  id: string,
  input: Partial<CorridorWriteInput>,
  options: { store?: CorridorStore; actorRole: AppRole },
): Promise<RouteCorridor | CorridorError> {
  const denied = assertCanWriteCorridors(options.actorRole);
  if (denied) return denied;
  if (
    input.name !== undefined ||
    input.origin !== undefined ||
    input.destination !== undefined
  ) {
    const merged: CorridorWriteInput = {
      name: input.name ?? "x",
      origin: input.origin ?? "x",
      destination: input.destination ?? "x",
    };
    if (input.name !== undefined && !input.name.trim()) {
      return corridorError("VALIDATION_ERROR", "name cannot be empty.");
    }
    if (input.origin !== undefined && !input.origin.trim()) {
      return corridorError("VALIDATION_ERROR", "origin cannot be empty.");
    }
    if (input.destination !== undefined && !input.destination.trim()) {
      return corridorError("VALIDATION_ERROR", "destination cannot be empty.");
    }
    void merged;
  }
  const store = options.store ?? createCorridorStore();
  const result = await store.update(id, input);
  if (isCorridorError(result)) return result;
  return result;
}

export async function deactivateCorridor(
  id: string,
  options: { store?: CorridorStore; actorRole: AppRole },
): Promise<RouteCorridor | CorridorError> {
  return updateCorridor(id, { active: false }, options);
}
