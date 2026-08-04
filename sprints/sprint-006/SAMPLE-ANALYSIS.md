# PACK-006 Sample Analysis

> Status: **PACK_006_SAMPLE_EVIDENCE_READY** (DS-004 complete 2026-08-04)  
> Live provider accuracy run: **blocked on DS-005**  
> Authorized path: `references/private/pack-006/` (gitignored)

## 1. Path verification (executable evidence — 2026-08-04 final check)

| Check | Result |
|---|---|
| `references/` exists | YES |
| `references/private/` exists | YES |
| `references/private/pack-006/` exists | YES |
| PDF files under authorized path | **26** |
| Expected manifests under authorized path | **26** |
| PDF↔manifest pairing orphans | **0** |
| JSON parse failures | **0** |
| `human_verified` manifests | **8** |
| `template_empty` manifests | **18** |
| Path gitignored | YES (`references/private/`) |

**Conclusion:** DS-004 sample gate is satisfied. Ground-truth pairs exist for Architect Review and non-provider Dry-Run preparation. Live Gemini/xAI evaluation remains blocked on DS-005.

## 2. Verified sample registration

| ID | Status | Profile / notes (abstract; values private) |
|---|---|---|
| SPL-006-001 | human_verified | simple transport; 2 stops |
| SPL-006-002 | human_verified | simple transport; freight + cargo totals |
| SPL-006-003 | human_verified | partial loads + shared delivery; 3 stops |
| SPL-006-004 | human_verified | roundtrip; 4 stops; 2 legs |
| SPL-006-007 | human_verified | roundtrip; 4 stops; 2 legs |
| SPL-006-013 | human_verified | three partial loads; incomplete address; 6 stops |
| SPL-006-017 | human_verified | billing-line provenance (Line Haul Units / Grand Total) |
| SPL-006-020 | human_verified | billing-line provenance (same pattern as 017) |

## 3. Inventory residual

- 18 `template_empty` scaffolds remain for other local PDFs (not fabricated).  
- Content duplicate: SPL-006-010 ≡ SPL-006-011 (identical SHA-256); both empty templates; documented in `rename-map.csv`.  
- Filling additional templates is optional coverage work, not required to keep DS-004 closed.

## 4. Field-coverage / ground-truth matrix

**Status: READY TO BUILD from the 8 human_verified manifests** (Architect next session).  
Do not invent values. Use only verified manifests under the private path.

Template columns remain:

| field_path | SPL-001 | SPL-002 | SPL-003 | … | match_class | notes |
|---|---|---|---|---|---|---|
| header.tour_number | | | | | exact / normalized | |
| header.freight.amount/currency | | | | | numeric | |
| header.paid_km / empty_km | | | | | numeric | |
| stops[i].* | | | | | stop completeness/order | |

## 5. Measurable extraction acceptance criteria (framework locked)

Unchanged from prior Architect lock (exact-match, normalized-match, stop completeness/order, numeric accuracy, hallucination rate, missing-value behavior). Evaluation against providers requires DS-005.

## 6. Dry-Run sufficiency verdict

| Question | Verdict |
|---|---|
| Is DS-004 satisfied? | **YES** |
| Is design/non-provider Dry-Run preparable? | **YES** after ADR-009 Architect Review |
| Is live-provider Dry-Run authorized? | **NO** — DS-005 open |
| Minimum for live-provider work | Written DS-005 approval + explicit Dry-Run auth |

See `DRY-RUN-READINESS.md`.
