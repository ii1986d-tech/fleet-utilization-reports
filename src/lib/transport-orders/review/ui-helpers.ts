import type { FieldReview, ReviewStatus } from "@/lib/transport-orders/types";
import {
  isTerminalReviewStatus,
  reviewStatusLabelDe,
  usesConfirmedVisual,
} from "@/lib/transport-orders/review/states";

/** Non-color status marker — label text remains the source of meaning. */
export function reviewStatusIndicator(status: ReviewStatus): string {
  switch (status) {
    case "confirmed":
      return "✓";
    case "missing_confirmed":
      return "∅";
    case "not_applicable":
      return "⊘";
    case "edited_pending_review":
      return "✎";
    case "conflict":
      return "!";
    case "extraction_failed":
      return "×";
    case "pending_review":
      return "·";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function reviewChipStyle(status: ReviewStatus): {
  background: string;
  color: string;
  label: string;
  indicator: string;
  terminal: boolean;
} {
  const label = reviewStatusLabelDe(status);
  const indicator = reviewStatusIndicator(status);
  const terminal = isTerminalReviewStatus(status);
  if (usesConfirmedVisual(status)) {
    return { background: "#0b3d91", color: "#fff", label, indicator, terminal };
  }
  if (status === "conflict" || status === "extraction_failed") {
    return { background: "#f5a623", color: "#111", label, indicator, terminal };
  }
  if (status === "edited_pending_review") {
    return { background: "#fff3cd", color: "#111", label, indicator, terminal };
  }
  return { background: "#e9ecef", color: "#111", label, indicator, terminal };
}

/** Confirm before N/A when an extracted or current value would be treated as not applicable. */
export function needsNotApplicableConfirmation(fr: FieldReview): boolean {
  const hasValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  };
  return hasValue(fr.extractedValue) || hasValue(fr.currentValue);
}

export const NOT_APPLICABLE_CONFIRM_MESSAGE =
  "Dieses Feld wird für diesen Auftrag als nicht zutreffend behandelt. Extrahierte oder bearbeitete Werte bleiben sichtbar, gelten aber nicht als anwendbar. Fortfahren?";
