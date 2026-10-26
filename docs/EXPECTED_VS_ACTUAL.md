# Expected vs Actual On-Chain Results

This document compares the pre-registered fixture predictions and calculated progress scores against the actual values produced on GenLayer Studionet during Milestone 4 on-chain validation.

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
- Verified count: `3`
- Review count: `0`
- Match: **EXACT MATCH**

### Scenario 2 (M1 DELIVERED, M2 DELIVERED, M3 MISSED)
- Weight computation: `(3 * 100 + 5 * 100 + 2 * 0) // 10 = (300 + 500 + 0) // 10 = 800 // 10 = 80`
- Hand-computed `progress_pct`: `80`
- Actual On-Chain `progress_pct`: `80`
- Verified count: `3`
- Review count: `0`
- Match: **EXACT MATCH**

---

## 3. TrancheGate Credit Conservation Invariant

- **Rule**: `balance_of(funder) + balance_of(recipient) + total_escrow == total_minted`
- **Initial Claim**: 1,000 demo credits claimed by funder (`total_minted = 1000`).
- **Grant Allocation**: Tranche 0 (300), Tranche 1 (400), Tranche 2 (200) -> 900 escrowed, 100 remaining in funder balance.
- **After Release Tranche 0** (M1 `DELIVERED`): 300 transferred from escrow to recipient.
- **After Release Tranche 1** (M2 `DELIVERED`): 400 transferred from escrow to recipient.
- **After Reclaim Tranche 2** (M3 `MISSED`): 200 returned from escrow to funder.
- **Final Read-Back Balances**:
  - Funder Balance: `300` (100 unallocated + 200 reclaimed)
  - Recipient Balance: `700` (300 tranche 0 + 400 tranche 1)
  - Total Escrow Remaining: `0`
  - Total Minted: `1000`
  - Invariant Check: `300 + 700 + 0 = 1000 == 1000`
- **Result**: **100% CONSERVED (ZERO LEAKAGE)**

---

## 4. Latency: Tripwire-Gated vs Judged Model Verification

- **Judged Run (LLM Call)**:
  - Web fetch + prompt build + GenVM LLM execution + quote validation: **14.86s - 18.20s**
- **Tripwire-Gated Run (`m3-injection.md`)**:
  - Web fetch + deterministic regex scan -> Immediate tripwire detection -> Defaults to `REVIEW`: **4.10s - 7.50s**
- **Latency Reduction**: Over 55% reduction in latency when malicious injection pattern is intercepted deterministically before invoking the LLM.
