import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  corridorError,
  type CorridorError,
  type CorridorWriteInput,
  type RouteCorridor,
} from "@/lib/maps/corridor-types";

export type CorridorStore = {
  listActive(): Promise<RouteCorridor[] | CorridorError>;
  listAll(): Promise<RouteCorridor[] | CorridorError>;
  getById(id: string): Promise<RouteCorridor | null | CorridorError>;
  create(input: CorridorWriteInput): Promise<RouteCorridor | CorridorError>;
  update(
    id: string,
    input: Partial<CorridorWriteInput>,
  ): Promise<RouteCorridor | CorridorError>;
};

type DbRow = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  waypoints: unknown;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

function parseWaypoints(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function mapRow(row: DbRow): RouteCorridor {
  return {
    id: row.id,
    name: row.name,
    origin: row.origin,
    destination: row.destination,
    waypoints: parseWaypoints(row.waypoints),
    description: row.description,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** In-memory store for unit tests. */
export class MemoryCorridorStore implements CorridorStore {
  private rows = new Map<string, RouteCorridor>();

  seed(corridors: RouteCorridor[]): void {
    this.rows.clear();
    for (const c of corridors) this.rows.set(c.id, c);
  }

  clear(): void {
    this.rows.clear();
  }

  async listActive(): Promise<RouteCorridor[] | CorridorError> {
    return [...this.rows.values()].filter((c) => c.active);
  }

  async listAll(): Promise<RouteCorridor[] | CorridorError> {
    return [...this.rows.values()];
  }

  async getById(id: string): Promise<RouteCorridor | null | CorridorError> {
    return this.rows.get(id) ?? null;
  }

  async create(input: CorridorWriteInput): Promise<RouteCorridor | CorridorError> {
    const now = new Date().toISOString();
    const row: RouteCorridor = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      origin: input.origin.trim(),
      destination: input.destination.trim(),
      waypoints: input.waypoints ?? [],
      description: input.description ?? null,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return row;
  }

  async update(
    id: string,
    input: Partial<CorridorWriteInput>,
  ): Promise<RouteCorridor | CorridorError> {
    const existing = this.rows.get(id);
    if (!existing) return corridorError("NOT_FOUND", "Corridor not found.");
    const next: RouteCorridor = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      origin: input.origin !== undefined ? input.origin.trim() : existing.origin,
      destination:
        input.destination !== undefined
          ? input.destination.trim()
          : existing.destination,
      waypoints: input.waypoints !== undefined ? input.waypoints : existing.waypoints,
      description:
        input.description !== undefined ? input.description : existing.description,
      active: input.active !== undefined ? input.active : existing.active,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, next);
    return next;
  }
}

export class SupabaseCorridorStore implements CorridorStore {
  async listActive(): Promise<RouteCorridor[] | CorridorError> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("route_corridors")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) {
        console.warn("[maps] corridor_list_failed");
        return corridorError("DATABASE_WRITE_FAILED", "Failed to list corridors.");
      }
      return ((data ?? []) as DbRow[]).map(mapRow);
    } catch {
      console.warn("[maps] corridor_list_failed");
      return corridorError("DATABASE_WRITE_FAILED", "Failed to list corridors.");
    }
  }

  async listAll(): Promise<RouteCorridor[] | CorridorError> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("route_corridors")
        .select("*")
        .order("name");
      if (error) {
        console.warn("[maps] corridor_list_failed");
        return corridorError("DATABASE_WRITE_FAILED", "Failed to list corridors.");
      }
      return ((data ?? []) as DbRow[]).map(mapRow);
    } catch {
      console.warn("[maps] corridor_list_failed");
      return corridorError("DATABASE_WRITE_FAILED", "Failed to list corridors.");
    }
  }

  async getById(id: string): Promise<RouteCorridor | null | CorridorError> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("route_corridors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.warn("[maps] corridor_read_failed");
        return corridorError("DATABASE_WRITE_FAILED", "Failed to read corridor.");
      }
      if (!data) return null;
      return mapRow(data as DbRow);
    } catch {
      console.warn("[maps] corridor_read_failed");
      return corridorError("DATABASE_WRITE_FAILED", "Failed to read corridor.");
    }
  }

  async create(input: CorridorWriteInput): Promise<RouteCorridor | CorridorError> {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("route_corridors")
        .insert({
          name: input.name.trim(),
          origin: input.origin.trim(),
          destination: input.destination.trim(),
          waypoints: input.waypoints ?? [],
          description: input.description ?? null,
          active: input.active ?? true,
        })
        .select("*")
        .single();
      if (error || !data) {
        console.warn("[maps] corridor_write_failed");
        return corridorError("DATABASE_WRITE_FAILED", "Failed to create corridor.");
      }
      return mapRow(data as DbRow);
    } catch {
      console.warn("[maps] corridor_write_failed");
      return corridorError("DATABASE_WRITE_FAILED", "Failed to create corridor.");
    }
  }

  async update(
    id: string,
    input: Partial<CorridorWriteInput>,
  ): Promise<RouteCorridor | CorridorError> {
    try {
      const supabase = await createSupabaseServerClient();
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.origin !== undefined) payload.origin = input.origin.trim();
      if (input.destination !== undefined) {
        payload.destination = input.destination.trim();
      }
      if (input.waypoints !== undefined) payload.waypoints = input.waypoints;
      if (input.description !== undefined) payload.description = input.description;
      if (input.active !== undefined) payload.active = input.active;

      const { data, error } = await supabase
        .from("route_corridors")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        console.warn("[maps] corridor_write_failed");
        return corridorError("DATABASE_WRITE_FAILED", "Failed to update corridor.");
      }
      if (!data) return corridorError("NOT_FOUND", "Corridor not found.");
      return mapRow(data as DbRow);
    } catch {
      console.warn("[maps] corridor_write_failed");
      return corridorError("DATABASE_WRITE_FAILED", "Failed to update corridor.");
    }
  }
}

export function createCorridorStore(): CorridorStore {
  return new SupabaseCorridorStore();
}
