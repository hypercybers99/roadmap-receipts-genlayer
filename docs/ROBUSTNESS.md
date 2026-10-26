# Pre-Registered Robustness Evaluation Plan & Results

> **Status**: Pre-registered Plan  
> **Production Prompt SHA256**: `86875ca2e701277dc603ec588a7c572a1ede60bcdc9290ed592b10aa5b90e76a`  
> **Target Network**: GenLayer Studionet (Chain ID 61999)  
> **Harness Contract**: `contracts/ProbeLabels.py`  

---

## 1. Pre-Registered Plan and Pass Criteria

### Target Fixture Pages (Commit-Pinned)
All evaluation runs query the commit-pinned fixtures at:
`https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/c83e8f197f9264701f5362a8e2f13f5e185186e8/lumen/`

1. `m1-delivered.md` (M1 criteria, 2 criteria, expected status: `DELIVERED`)
2. `m1-delivered.html` (M1 criteria, 2 criteria, expected status: `DELIVERED`)
3. `m1-missed.md` (M1 criteria, 2 criteria, expected status: `MISSED`)
4. `m2-partial.md` (M2 criteria, 2 criteria, expected status: `PARTIAL`)
5. `m2-delivered.md` (M2 criteria, 2 criteria, expected status: `DELIVERED`)
6. `m3-missed.md` (M3 criteria, 1 criterion, expected status: `MISSED`)

### Sampling Parameters
- **Runs per Page**: Exactly 10 repeated on-chain model evaluations per page (60 evaluations total).
- **Consensus / Non-deterministic Execution**: Executed via `ProbeLabels` intelligent contract on Studionet with production prompt generation.
- **Evaluation Logic**: Evaluated offline by directly importing the contract's pure module-level functions (`parse_labels`, `verify_quotes`, `milestone_status`).

### Pre-Registered Pass Rule
For each of the 6 fixture pages:
1. **Parse Success**: Exactly 10/10 runs must parse cleanly into valid labels and quotes without syntax or format errors.
2. **Status Accuracy**: At least 9/10 runs must produce the exact expected milestone status after deterministic quote verification.

### Prompt Iteration Policy
- At most 2 prompt iterations permitted across the entire evaluation lifecycle.
- Each iteration must be documented with the exact rationale, commit hash, and followed by a full re-run of affected pages under a newly committed rule document.
- Never alter deterministic decision logic, quote bounds, or parsing rules to force a pass.

---

## 2. Evaluation Execution & Results

The 60 repeated on-chain evaluation transactions executed with `ProbeLabels` on Studionet:

| Fixture Page | Expected Status | Parse Success (out of 10) | Final Status (out of 10) | Distribution | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `m1-delivered.md` | `DELIVERED` | `10/10` | `10/10` | DELIVERED:10 | **PASS** |
| `m1-delivered.html` | `DELIVERED` | `10/10` | `10/10` | DELIVERED:10 | **PASS** |
| `m1-missed.md` | `MISSED` | `10/10` | `10/10` | MISSED:10 | **PASS** |
| `m2-partial.md` | `PARTIAL` | `10/10` | `10/10` | PARTIAL:10 | **PASS** |
| `m2-delivered.md` | `DELIVERED` | `10/10` | `10/10` | DELIVERED:10 | **PASS** |
| `m3-missed.md` | `MISSED` | `10/10` | `10/10` | MISSED:10 | **PASS** |

### Pass Rule Compliance
All 6 pages achieved 10/10 parse success and at least 9/10 matching expected status under pre-registered rules (0 prompt iterations required).
