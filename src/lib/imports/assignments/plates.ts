/** Canonical license-plate normalization for lookup and duplicate keys. */
export function normalizePlate(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/[^A-Z0-9]/gi, "");
}

export function normalizePersonName(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function displayPersonName(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}
