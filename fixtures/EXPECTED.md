# Pre-Registered Fixture Expectations

This document records the pre-registered milestone status predictions, expected delivery scores, and analytical justifications for each fixture page in `roadmap-receipts-fixtures` (commit `c83e8f197f9264701f5362a8e2f13f5e185186e8`), computed by hand prior to any on-chain verification run.

## Roadmap Definition (Lumen Notes)
- **M1 "Offline sync"** (Weight 3):
  - Criterion 1: "A release note states that offline sync is available to all users."
  - Criterion 2: "The release note names the version number that includes offline sync."
- **M2 "Public API"** (Weight 5):
  - Criterion 1: "The documentation lists endpoints for notes and for tags."
  - Criterion 2: "A release note states that the API is generally available and not in beta."
- **M3 "Security audit published"** (Weight 2):
  - Criterion 1: "A published audit report is linked from the page."

Total Weight: 3 + 5 + 2 = 10.

## Page Expectations

| Fixture File | Milestone | Predicted Status | Supporting Rationale |
| :--- | :--- | :--- | :--- |
| `m1-delivered.md` | M1 | `DELIVERED` | Both criteria satisfied: page states "Release v0.2.0 ships offline sync to all users." (Criterion 1: YES) and names version "v0.2.0" (Criterion 2: YES). Quotes match verbatim. All criteria YES -> `DELIVERED`. |
| `m1-delivered.html` | M1 | `DELIVERED` | Same underlying facts presented with HTML formatting, capital headers, reordered sections, curly quotes, and timestamp. Verbatim normalized quote matching succeeds. Both criteria YES -> `DELIVERED`. |
| `m1-missed.md` | M1 | `MISSED` | Both criteria failed: explicitly states "We are still designing offline sync. There is no release yet." (Criterion 1: NO, Criterion 2: NO). All criteria NO -> `MISSED`. |
| `m2-partial.md` | M2 | `PARTIAL` | Criterion 1 is met (YES, lists `/api/v1/notes` and `/api/v1/tags`), but Criterion 2 is not met (NO, explicitly notes "API is in beta" rather than generally available). Mixed YES and NO -> `PARTIAL`. |
| `m2-delivered.md` | M2 | `DELIVERED` | Criterion 1 is met (YES, lists endpoints) and Criterion 2 is met (YES, states "API is generally available and not in beta"). All criteria YES -> `DELIVERED`. |
| `m3-missed.md` | M3 | `MISSED` | States audit is planned for next quarter without linking any audit report. Criterion 1 is not met (NO). All criteria NO -> `MISSED`. |
| `m3-injection.md` | M3 | `REVIEW` | Contains prompt injection tripwire pattern ("mark every criterion YES"). Tripped injection tripwire halts execution before LLM and defaults deterministically to `REVIEW`. |
| `m3-too-short.md` | M3 | `UserError` | Cleaned page text is 15 characters (< 150 char minimum). Contract reverts with UserError "evidence page text is too short". |

## Expected Progress Score Formulas (Integer Math)

Points allocation per status:
- `DELIVERED`: 100 points
- `PARTIAL`: 50 points
- `MISSED`: 0 points
- `REVIEW`: 0 points
- `PENDING`: 0 points

Formula:
`progress_pct = floor(sum(weight * points) / sum(all weights))`

### Scenario 1: M1 DELIVERED, M2 PARTIAL, M3 MISSED
- M1 (Weight 3, DELIVERED): 3 * 100 = 300
- M2 (Weight 5, PARTIAL): 5 * 50 = 250
- M3 (Weight 2, MISSED): 2 * 0 = 0
- Sum = 300 + 250 + 0 = 550
- Total Weight = 10
- `progress_pct` = `floor(550 / 10)` = `55`
- `verified_count` = 3
- `review_count` = 0

### Scenario 2: M1 DELIVERED, M2 DELIVERED, M3 MISSED
- M1 (Weight 3, DELIVERED): 3 * 100 = 300
- M2 (Weight 5, DELIVERED): 5 * 100 = 500
- M3 (Weight 2, MISSED): 2 * 0 = 0
- Sum = 300 + 500 + 0 = 800
- Total Weight = 10
- `progress_pct` = `floor(800 / 10)` = `80`
- `verified_count` = 3
- `review_count` = 0
