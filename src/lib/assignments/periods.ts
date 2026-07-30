export type IsoDate = string; // YYYY-MM-DD

export type AssignmentPeriod = {
  validFrom: IsoDate;
  validUntil: IsoDate | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

/** Inclusive end; null = open-ended (+∞). */
export function assertValidPeriod(period: AssignmentPeriod): void {
  if (!isIsoDate(period.validFrom)) {
    throw new Error("INVALID_VALID_FROM");
  }
  if (period.validUntil !== null) {
    if (!isIsoDate(period.validUntil)) {
      throw new Error("INVALID_VALID_UNTIL");
    }
    if (period.validUntil < period.validFrom) {
      throw new Error("INVALID_PERIOD_RANGE");
    }
  }
}

export function normalizePeriod(input: {
  validFrom: string;
  validUntil?: string | null;
}): AssignmentPeriod {
  const period: AssignmentPeriod = {
    validFrom: input.validFrom.trim(),
    validUntil:
      input.validUntil === undefined ||
      input.validUntil === null ||
      input.validUntil.trim() === ""
        ? null
        : input.validUntil.trim(),
  };
  assertValidPeriod(period);
  return period;
}
