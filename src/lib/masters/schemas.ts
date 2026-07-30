import { z } from "zod";

export const vehicleInsertSchema = z.object({
  registrationNumber: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(200),
  vehicleType: z.string().trim().max(100).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const vehicleUpdateSchema = vehicleInsertSchema.partial().extend({
  id: z.string().uuid(),
});

export const driverInsertSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  employeeNumber: z.string().trim().max(64).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const driverUpdateSchema = driverInsertSchema.partial().extend({
  id: z.string().uuid(),
});

export const customerInsertSchema = z.object({
  name: z.string().trim().min(1).max(200),
  externalReference: z.string().trim().max(100).optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const customerUpdateSchema = customerInsertSchema.partial().extend({
  id: z.string().uuid(),
});

export type VehicleRow = {
  id: string;
  registration_number: string;
  display_name: string;
  vehicle_type: string | null;
  active: boolean;
};

export type DriverRow = {
  id: string;
  full_name: string;
  employee_number: string | null;
  active: boolean;
};

export type CustomerRow = {
  id: string;
  name: string;
  external_reference: string | null;
  active: boolean;
};
