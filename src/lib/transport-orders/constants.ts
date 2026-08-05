/** Design defaults from ADR-009 §23–24. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 50;
export const PROVIDER_TIMEOUT_MS = 60_000;
export const PROVIDER_MAX_ATTEMPTS = 3;
export const TRANSPORT_ORDER_PROVIDER_ENV = "TRANSPORT_ORDER_PROVIDER";
export const DEFAULT_PROVIDER_NAME = "mock";
export const PRIVATE_STORAGE_BUCKET = "transport-order-pdfs";
