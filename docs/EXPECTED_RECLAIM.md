# Pre-Registered Reclaim Verification Plan

> **Status**: Pre-registered Plan (Committed prior to execution)  
> **Network**: GenLayer Studionet (Chain ID 61999)  
> **Active RoadmapLedger**: `0xBF1e1b015cAd13eDf54F056ef15199160cA90984`  
> **Active TrancheGate**: `0x6e97C82f7eFB8BFDD43BcF4cB16d27F28b93FC41`  

---

## 1. Objective & Hypothesis

This document pre-registers the exact sequence of on-chain operations, state assertions, and credit conservation invariant checks to prove the `reclaim` functionality of `TrancheGate`.

In the initial test run, `reclaim` on milestone 2 failed because milestone 2 had previously been updated to `m3-injection.md` (status `REVIEW`) and an attempt to reset it failed due to duplicate observation checking. Consequently, `TrancheGate` correctly refused to reclaim an un-missed milestone (`cannot reclaim: milestone status is review`).

This protocol creates a dedicated roadmap and grant where each milestone's status is established cleanly, proving:
1. Reclaim of a `DELIVERED` milestone refuses with `cannot reclaim: milestone status is delivered`.
2. Reclaim of a `REVIEW` milestone refuses with `cannot reclaim: milestone status is review`.
3. Reclaim of a `MISSED` milestone succeeds, transferring the tranche amount back to the funder.
4. Duplicate reclaim of an already-reclaimed tranche refuses with `tranche already reclaimed`.
5. Release of a `DELIVERED` milestone succeeds, transferring the tranche amount to the recipient.
6. The conservation invariant holds at every stage:
   `balance_of(funder) + balance_of(recipient) + total_escrow == total_minted`

---

## 2. Pre-Registered Test Steps & Expected Values

### Step 1: Create Dedicated Roadmap
- Roadmap Name: `"Reclaim Proof Roadmap"`
- Milestones:
  - M0 (Index 0): Title `"Offline sync"`, weight 3, evidence URL `m1-delivered.md`.
  - M1 (Index 1): Title `"Public API"`, weight 5, evidence URL `m3-injection.md`.
  - M2 (Index 2): Title `"Security audit published"`, weight 2, evidence URL `m3-missed.md`.
- Expected Outcome: Roadmap created with ID `"2"`, initial `progress_pct: "0"`.

### Step 2: Establish Milestone Statuses On-Chain
- Call `verify(roadmap_id, 0)` on `m1-delivered.md`:
  - Expected Status: `DELIVERED`.
- Call `verify(roadmap_id, 1)` on `m3-injection.md`:
  - Expected Status: `REVIEW` (gate: `TRIPWIRE`).
- Call `verify(roadmap_id, 2)` on `m3-missed.md`:
  - Expected Status: `MISSED`.

### Step 3: Funder Claims Demo Credits & Creates Grant
- Funder claims 1,000 demo credits:
  - `balance_of(funder) = 1000`
  - `total_minted = 1000`
  - `total_escrow = 0`
- Funder creates grant against Roadmap:
  - Tranche 0: milestone index 0, amount 300
  - Tranche 1: milestone index 1, amount 400
  - Tranche 2: milestone index 2, amount 200
  - Total allocated: 900
- State immediately after grant creation:
  - `balance_of(funder) = 100` (1000 - 900)
  - `balance_of(recipient) = 0`
  - `total_escrow = 900`
  - Invariant: `100 + 0 + 900 = 1000 == 1000` (Conserved)

### Step 4: Reclaim Attempt on DELIVERED Milestone (Tranche 0)
- Call `reclaim(grant_id, 0)`:
  - Expected Result: `ACCEPTED`, `MAJORITY_AGREE`, `leader_result: ERROR`.
  - Expected UserError payload: `"cannot reclaim: milestone status is delivered"`.
  - State unchanged: `balance_of(funder) = 100`, `total_escrow = 900`.

### Step 5: Reclaim Attempt on REVIEW Milestone (Tranche 1)
- Call `reclaim(grant_id, 1)`:
  - Expected Result: `ACCEPTED`, `MAJORITY_AGREE`, `leader_result: ERROR`.
  - Expected UserError payload: `"cannot reclaim: milestone status is review"`.
  - State unchanged: `balance_of(funder) = 100`, `total_escrow = 900`.

### Step 6: Legitimate Reclaim on MISSED Milestone (Tranche 2)
- Call `reclaim(grant_id, 2)`:
  - Expected Result: `ACCEPTED`, `MAJORITY_AGREE`, `leader_result: SUCCESS`.
  - Amount 200 returned from escrow to funder.
  - State after reclaim:
    - `balance_of(funder) = 300` (100 + 200)
    - `balance_of(recipient) = 0`
    - `total_escrow = 700` (900 - 200)
    - Tranche 2 status: `reclaimed = true`
    - Invariant: `300 + 0 + 700 = 1000 == 1000` (Conserved)

### Step 7: Duplicate Reclaim Attempt on Tranche 2
- Call `reclaim(grant_id, 2)` a second time:
  - Expected Result: `ACCEPTED`, `MAJORITY_AGREE`, `leader_result: ERROR`.
  - Expected UserError payload: `"tranche already reclaimed"`.
  - State unchanged: `balance_of(funder) = 300`, `total_escrow = 700`.

### Step 8: Legitimate Release on DELIVERED Milestone (Tranche 0)
- Call `release(grant_id, 0)`:
  - Expected Result: `ACCEPTED`, `MAJORITY_AGREE`, `leader_result: SUCCESS`.
  - Amount 300 released from escrow to recipient.
  - State after release:
    - `balance_of(funder) = 300`
    - `balance_of(recipient) = 300`
    - `total_escrow = 400` (700 - 300)
    - Invariant: `300 + 300 + 400 = 1000 == 1000` (Conserved)
