export type ParsedIsoDate = string; // YYYY-MM-DD

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toIsoDateUTC(year: number, month: number, day: number): ParsedIsoDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Excel serial date → calendar ISO date (no TZ day shift). */
export function excelSerialToIso(serial: number): ParsedIsoDate | null {
  if (!Number.isFinite(serial) || serial < 1) {
    return null;
  }
  // Excel epoch 1899-12-30 (with Lotus leap bug compatibility for serial >= 60)
  const utc = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000;
  const d = new Date(utc);
  return toIsoDateUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function parseDateInput(value: unknown): {
  iso: ParsedIsoDate | null;
  error?: string;
} {
  if (value === null || value === undefined || value === "") {
    return { iso: null };
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      iso: toIsoDateUTC(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()),
    };
  }

  if (typeof value === "number") {
    const iso = excelSerialToIso(value);
    return iso ? { iso } : { iso: null, error: "Invalid Excel serial date." };
  }

  if (typeof value !== "string") {
    return { iso: null, error: "Unsupported date cell type." };
  }

  const text = value.normalize("NFKC").trim();
  if (!text) {
    return { iso: null };
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    const iso = toIsoDateUTC(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
    return iso ? { iso } : { iso: null, error: "Invalid ISO date." };
  }

  const deMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (deMatch) {
    const iso = toIsoDateUTC(
      Number(deMatch[3]),
      Number(deMatch[2]),
      Number(deMatch[1]),
    );
    return iso ? { iso } : { iso: null, error: "Invalid German date." };
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slashMatch) {
    const a = Number(slashMatch[1]);
    const b = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    // Unambiguous DD/MM/YYYY only: day > 12, or day==month, else reject ambiguity
    if (a > 12 && b >= 1 && b <= 12) {
      const iso = toIsoDateUTC(y, b, a);
      return iso ? { iso } : { iso: null, error: "Invalid slash date." };
    }
    if (b > 12 && a >= 1 && a <= 12) {
      // Would be MM/DD — reject as ambiguous policy (we only accept unambiguous DD/MM)
      return { iso: null, error: "Ambiguous or unsupported slash date." };
    }
    if (a === b && a >= 1 && a <= 12) {
      const iso = toIsoDateUTC(y, a, a);
      return iso ? { iso } : { iso: null, error: "Invalid slash date." };
    }
    return { iso: null, error: "Ambiguous slash date; use YYYY-MM-DD or DD.MM.YYYY." };
  }

  return { iso: null, error: "Unrecognized date format." };
}
