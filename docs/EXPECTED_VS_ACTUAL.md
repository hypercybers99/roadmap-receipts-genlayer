# Expected vs Actual On-Chain Results

This document compares pre-registered fixture predictions against actual values produced on GenLayer Studionet during Milestone 4 on-chain validation.
All values in this document are extracted dynamically from raw execution receipts and snapshots (`docs/evidence/onchain_receipts.json`, `docs/evidence/onchain_readbacks.json`, and `docs/evidence/reclaim_snapshots.json`).

---

## 1. Milestone Status Comparison Table

| Milestone / Fixture | Evidence URL File | Pre-Registered Expected Status | Actual On-Chain Status | Deterministic Gate | Match? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M1: Offline sync** | `m1-delivered.md` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M1: Offline sync (HTML)** | `m1-delivered.html` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M1: Offline sync (Missed)**| `m1-missed.md` | `MISSED` | `MISSED` | Standard (LLM + Quote) | **MATCH** |
| **M2: Public API (Partial)** | `m2-partial.md` | `PARTIAL` | `PARTIAL` | Standard (LLM + Quote) | **MATCH** |
| **M2: Public API (Full)** | `m2-delivered.md` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M3: Security audit** | `m3-missed.md` | `MISSED` | `MISSED` | Standard (LLM + Quote) | **MATCH** |
| **M3: Injection tripwire** | `m3-injection.md` | `REVIEW` | `REVIEW` | `TRIPWIRE` (Zero LLM) | **MATCH** |
| **M3: Text < 150 chars** | `m3-too-short.md` | `UserError` | `UserError` | Size validation (<150) | **MATCH** |

---

## 2. Hand-Computed vs Actual Progress Scores

Points Allocation: `DELIVERED` = 100, `PARTIAL` = 50, `MISSED` = 0, `REVIEW` = 0, `PENDING` = 0.  
Formula: `progress_pct = floor(sum(weight * points) / sum(weights))`.  
Lumen Notes Weights: M1 = 3, M2 = 5, M3 = 2 (Total Weight = 10).

### Initial Roadmap State
- Hand-computed `progress_pct`: `0`
- Actual On-Chain `progress_pct`: `0`
- Match: **EXACT MATCH**

### Scenario 1 (M1 DELIVERED, M2 PARTIAL, M3 MISSED)
- Weight computation: `(3 * 100 + 5 * 50 + 2 * 0) // 10 = (300 + 250 + 0) // 10 = 550 // 10 = 55`
- Hand-computed `progress_pct`: `55`
- Actual On-Chain `progress_pct`: `55`
- Match: **EXACT MATCH**

### Scenario 2 (M1 DELIVERED, M2 DELIVERED, M3 MISSED)
- Weight computation: `(3 * 100 + 5 * 100 + 2 * 0) // 10 = (300 + 500 + 0) // 10 = 800 // 10 = 80`
- Hand-computed `progress_pct`: `80`
- Actual On-Chain `progress_pct`: `80`
- Match: **EXACT MATCH**

### Scenario 3 (M1 DELIVERED, M2 DELIVERED, M3 REVIEW via Injection Tripwire)
- Weight computation: `(3 * 100 + 5 * 100 + 2 * 0) // 10 = 80` (REVIEW earns 0 points)
- Hand-computed `progress_pct`: `80`
- Actual On-Chain `progress_pct`: `80`
- Match: **EXACT MATCH**

---

## 3. TrancheGate Credit Conservation Invariant

The core conservation invariant enforced across all states is:
`balance_of(funder) + balance_of(recipient) + total_escrow == total_minted`

### Lifecycle Grant 1 State:
- Initial Funder Claim: `1000` demo credits.
- Grant Allocation: Tranche 0 (300), Tranche 1 (400), Tranche 2 (200) -> 900 escrowed, 100 unallocated funder balance.
- Release Tranche 0: `300` transferred from escrow to recipient.
- Release Tranche 1: `400` transferred from escrow to recipient.
- Reclaim Tranche 2 Attempt: Correctly rejected on-chain with `"cannot reclaim: milestone status is review"` because M3 remains in `REVIEW` after injection tripwire interception.
- Read-Back Balances for Grant 1:
  - Funder Balance: `100`
  - Recipient Balance: `700`
  - Escrow Remaining: `200`
  - Invariant Check: `100 + 700 + 200 = 1000 == 1000` (Zero leakage)

### Dedicated Reclaim Proof State (Pre-registered in docs/EXPECTED_RECLAIM.md):
- Grant Allocation: Tranche 0 (300, DELIVERED), Tranche 1 (400, REVIEW), Tranche 2 (200, MISSED).
- Reclaim Tranche 0 (DELIVERED) Refusal: `cannot reclaim: milestone status is delivered`
- Reclaim Tranche 1 (REVIEW) Refusal: `cannot reclaim: milestone status is review`
- Reclaim Tranche 2 (MISSED) Success: `200` returned from escrow to funder.
- Duplicate Reclaim Refusal: `tranche already reclaimed`
- Release Tranche 0 (DELIVERED) Success: `300` transferred from escrow to recipient.
- Final Balances for Dedicated Reclaim Proof:
  - Funder Balance: `300`
  - Recipient Balance: `300`
  - Escrow Remaining: `400`
  - Total Minted: `1000`
  - Invariant Sum: `1000 == 1000`
- Result: **100% CONSERVED (ZERO LEAKAGE)**

---

## 4. Latency: Tripwire-Gated vs Judged Model Verification

Raw on-chain transaction latencies recorded directly by client execution timer:

- **Judged Runs (LLM Call via GenVM)**:
  - Web fetch + prompt build + GenVM LLM execution + quote validation.
  - Measured range across 5 verification transactions: **15.10s - 21.65s**
- **Tripwire-Gated Run (`m3-injection.md`)**:
  - Web fetch + deterministic regex scan -> Immediate tripwire detection -> Defaults to `REVIEW`.
  - Zero model prompt iteration or GenVM LLM call executed.
  - Measured end-to-end consensus latency: **14.95s**
- **Observed Behavior**:
  - The tripwire completely eliminates non-deterministic model execution and avoids LLM prompt iterations.
  - End-to-end transaction latency includes studionet consensus, leader web-fetch, validator verification, and block inclusion.
