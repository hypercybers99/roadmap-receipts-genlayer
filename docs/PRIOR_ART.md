# Prior Art and Comparative Analysis

## 1. Overview of Prior Art in Milestone Tracking & Grant Governance

Decentralized grant distribution and milestone accountability have seen several existing designs across Web3:

1. **Karma GAP (Grantee Accountability Protocol)**:
   - *Architecture*: On-chain attestation framework (built on EAS - Ethereum Attestation Service) where grant recipients post milestones and project progress updates.
   - *Verification Mechanism*: Human reviewers, grant program managers, or community councils manually evaluate off-chain deliverables and sign on-chain attestations to mark milestones complete.
   - *Closest Design*: Karma GAP is the single closest existing project in purpose and domain.

2. **Questbook**:
   - *Architecture*: On-chain grant workflow management tool for DAOs (e.g. Compound, Polygon).
   - *Verification Mechanism*: Program managers review submitted milestone links and approve disbursements through multi-signature approval flows.

3. **Optimism RetroPGF / Citizens' House**:
   - *Architecture*: Retroactive funding mechanism where badgeholders vote on historical impact rather than upfront milestone promises.
   - *Verification Mechanism*: Subjective human voting rounds based on impact evaluation frameworks.

4. **Chainlink Functions & UMA Optimistic Oracle**:
   - *Architecture*: Data bridge to smart contracts. Chainlink Functions allows decentralized off-chain JavaScript execution on structured API endpoints (JSON/REST), but does not support non-deterministic LLM analysis of unstructured text. UMA uses financial bonding and a multi-day dispute period reliant on economic incentives and human tokenholder voting.

---

## 2. Comparison with Closest Prior Art: Karma GAP

| Feature / Dimension | Karma GAP | Roadmap Receipts (GenLayer) |
| :--- | :--- | :--- |
| **Verification Method** | Manual human committee review and EAS attestations | Decentralized validator nodes fetch public static web page, execute model evaluation, and verify verbatim quotes |
| **Execution Layer** | EVM (Ethereum / Arbitrum / Optimism) | GenVM intelligent contracts on GenLayer Studionet |
| **Milestone Immutability** | Grantees or admins can edit milestone text subject to council discretion | Criteria and titles are immutable upon creation; evidence URL updatable only within same host and directory path |
| **Delivery Decision Logic** | Subjective reviewer judgment | Deterministic state machine (`DELIVERED`, `PARTIAL`, `MISSED`, `REVIEW`) derived from quote-checked labels |
| **Disbursement Binding** | Manual multi-sig approval or admin release | `TrancheGate` verifies exact milestone completion against immutable `milestones_hash` via synchronous cross-contract view call |
| **Incentive / Dispute Vector** | Human reviewer fatigue, committee capture, slow turnaround | Non-deterministic consensus with short canonical token comparison; unverified quotes or injections default to `REVIEW` |

---

## 3. Honest Trade-Offs

While Roadmap Receipts removes human committee bottlenecks from milestone verification, it entails distinct design trade-offs:

1. **Ledger Credits vs. Monetary Capital**:
   - Roadmap Receipts operates on demo ledger credits in the contract; it does not custody real tokens or cryptocurrency.
2. **Text Verification vs. Actual Software Execution**:
   - Roadmap Receipts verifies what a public static page *says* with verifiable text quotes. It cannot verify whether deployed code actually functions or compiles.
3. **Owner URL Selection Within Directory**:
   - The roadmap owner can point to different files within the pre-registered host and directory path. The owner selects which file represents the release evidence.
4. **Static HTML/Text Constraint**:
   - Evidence pages must be accessible static documents (HTTP 200). JavaScript-rendered single-page applications or authenticated repositories cannot be read.
5. **Absence of Clock / Deadlines**:
   - No temporal deadlines or late penalties exist. Milestone progress is evaluated only on demand when `verify` is called.
6. **LLM Variance & Strict Consensus Token**:
   - To guard against LLM non-determinism, validators only achieve consensus on a compact token (`<STATUS>|<norm_hash16>`), leaving granular quotes as leader-reported data verified deterministically against page text.
