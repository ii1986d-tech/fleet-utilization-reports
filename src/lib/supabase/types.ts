/**
 * Database entity names for FUR-001 (see data/DATA-MODEL.md).
 * Full generated types can replace this after `supabase gen types`.
 */
export type UtilizationStatus =
  | "sufficient"
  | "below_target"
  | "far_below_target"
  | "not_used";

export type DataQualityStatus =
  | "complete"
  | "partial"
  | "missing"
  | "suspicious"
  | "manually_corrected";

export type AssignmentSource = "manual" | "excel_import" | "system";

export type DatabaseTable =
  | "vehicles"
  | "drivers"
  | "customers"
  | "vehicle_assignments"
  | "vehicle_daily_reports"
  | "import_jobs"
  | "sync_runs"
  | "utilization_settings";
