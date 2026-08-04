# PACK-006 Human ground-truth review (redacted)

> Status: **8/8 HUMAN VERIFIED** (DS-004 final evidence 2026-08-04)  
> Privacy: **H4 redacted** — no operational business values in this tracked file  
> Exact addresses, plates, prices, references, names, and transport identifiers remain only under `references/private/pack-006/` (gitignored)  
> Residual: 18 `template_empty` manifests intentionally empty  

## 1. Evidence summary

| Metric | Value |
|---|---|
| PDFs (private) | 26 |
| Matching manifests (private) | 26 |
| JSON parse issues | 0 |
| Orphan files | 0 |
| `human_verified` | 8 |
| `template_empty` | 18 |

## 2. Verified samples (abstract only)

| Sample ID | Status | Scenario classification | Stop count (count only) | Notes (generic) |
|---|---|---|---|---|
| SPL-006-001 | `human_verified` | simple transport | 2 | Standard pickup → delivery |
| SPL-006-002 | `human_verified` | simple transport | 2 | Chartering-style layout |
| SPL-006-003 | `human_verified` | partial loads + shared delivery | 3 | Two positions; shared delivery stop |
| SPL-006-004 | `human_verified` | roundtrip + transport legs | 4 | Repeated locations as separate stops |
| SPL-006-007 | `human_verified` | roundtrip + transport legs | 4 | Repeated origin/destination as separate stops |
| SPL-006-013 | `human_verified` | three partial loads + incomplete address | 6 | Manual reorder relevant; incomplete streets stay null |
| SPL-006-017 | `human_verified` | billing-line provenance | 3 | Paid km from Line Haul Units; freight from Grand Total (values private) |
| SPL-006-020 | `human_verified` | billing-line provenance | 2 | Same billing provenance pattern as 017 (values private) |

## 3. Validation results (generic)

- All 8 verified manifests parse as valid JSON.  
- `status: human_verified` and `review.human_verified: true` set in private manifests.  
- No invented streets for incomplete address samples.  
- Aggregate cargo not silently split onto positions when position-level cargo absent.  
- Partial-load and leg associations use stable stop identities in private manifests.  
- Exact field values are **not** reproduced in tracked documentation.

## 4. Progress tracker (status only)

| Sample | JSON valid | Human verified | Scenario |
|---|---|---|---|
| SPL-006-001 | YES | YES | simple transport |
| SPL-006-002 | YES | YES | simple transport |
| SPL-006-003 | YES | YES | partial loads |
| SPL-006-004 | YES | YES | roundtrip |
| SPL-006-007 | YES | YES | roundtrip |
| SPL-006-013 | YES | YES | incomplete address + partial loads |
| SPL-006-017 | YES | YES | billing-line provenance |
| SPL-006-020 | YES | YES | billing-line provenance |

## 5. Constraints

- Do not commit `references/private/**`.  
- Do not copy operational values into tracked docs.  
- Do not call Gemini / xAI / Maps for ground truth.  
- Do not populate `template_empty` manifests by invention.  
- DS-005 remains OPEN for live provider processing.
