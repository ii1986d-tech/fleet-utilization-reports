import {
  BLOCKING_REVIEW_STATUSES,
  REVIEW_STATUSES,
  TERMINAL_REVIEW_STATUSES,
  type ReviewStatus,
  type TerminalReviewStatus,
} from "@/lib/transport-orders/types";

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && (REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isTerminalReviewStatus(status: ReviewStatus): status is TerminalReviewStatus {
  return (TERMINAL_REVIEW_STATUSES as readonly string[]).includes(status);
}

export function isBlockingReviewStatus(status: ReviewStatus): boolean {
  return (BLOCKING_REVIEW_STATUSES as readonly string[]).includes(status);
}

/** UI DE labels — color is never source of truth. */
export function reviewStatusLabelDe(status: ReviewStatus): string {
  switch (status) {
    case "pending_review":
      return "Ungeprüft";
    case "edited_pending_review":
      return "Geändert – Bestätigung erforderlich";
    case "confirmed":
      return "Bestätigt";
    case "missing_confirmed":
      return "Fehlend bestätigt";
    case "not_applicable":
      return "Nicht zutreffend";
    case "conflict":
      return "Konflikt – Prüfung erforderlich";
    case "extraction_failed":
      return "Extraktion fehlgeschlagen";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Confirmed-family visual (dark blue) only for these persisted states. */
export function usesConfirmedVisual(status: ReviewStatus): boolean {
  switch (status) {
    case "confirmed":
    case "missing_confirmed":
    case "not_applicable":
      return true;
    case "pending_review":
    case "edited_pending_review":
    case "conflict":
    case "extraction_failed":
      return false;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Edit of a terminal field → edited_pending_review and clears confirmation metadata.
 */
export function statusAfterEdit(previous: ReviewStatus): ReviewStatus {
  switch (previous) {
    case "confirmed":
    case "missing_confirmed":
    case "not_applicable":
    case "pending_review":
    case "edited_pending_review":
    case "conflict":
    case "extraction_failed":
      return "edited_pending_review";
    default: {
      const _exhaustive: never = previous;
      return _exhaustive;
    }
  }
}

export function statusAfterConfirm(): ReviewStatus {
  return "confirmed";
}

export function statusAfterMarkMissing(): ReviewStatus {
  return "missing_confirmed";
}

export function statusAfterMarkNotApplicable(): ReviewStatus {
  return "not_applicable";
}
