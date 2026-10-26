# Limitations and Trust Assumptions

This document outlines the known boundaries, design trade-offs, and trust assumptions of the Roadmap Receipts intelligent contracts on GenLayer Studionet (Preview).

## 1. Demo Credits Ledger Only
The grant gate contract (`TrancheGate`) and ledger track internal accounting credits. No monetary currency, tokens, or financial instruments are transferred or locked. The contracts provide verifiable receipt state rather than banking or financial services.

## 2. Text Representation vs. Actual Software Functionality
Roadmap Receipts verifies what a public static evidence page explicitly states, not whether the referenced software or code actually executes correctly. A project could publish a factually untrue changelog; the intelligent contract records only that the specific public evidence page contained that claim, supported by a verbatim quote check.

## 3. Absence of On-Chain Clock and Deadlines
The contract has no deadline logic, expiration timers, or "late" status. A milestone is evaluated and its status determined whenever a caller triggers `verify`.

## 4. Evidence URL Mutability Within Scope
A roadmap owner may update the milestone's evidence URL via `update_evidence`, but strictly within the identical host and directory path. This provides operational flexibility for versioned release notes (e.g. `release-v2.html` replacing `release-v1.html`) while preventing arbitrary domain redirects. The owner retains the choice of which specific document in that directory serves as evidence, and every update is appended to the publicly visible `evidence_history`.

## 5. Public Static Text/HTML Documents Only
Evidence pages must be publicly accessible static text or HTML pages that return HTTP 200 within size constraints (150 chars minimum, 100 KB maximum). Pages requiring authentication, login sessions, CAPTCHA, or client-side JavaScript rendering cannot be evaluated and will revert or result in `REVIEW`.

## 6. Non-Deterministic Model Output & Strict Consensus Token
Language model completions may display slight phrasing or formatting variations across runs. To ensure deterministic validator consensus, validator nodes do not compare LLM free-text reasoning or secondary extraction fields. Instead, consensus is reached solely on a strict canonical token: `<STATUS>|<norm_hash16>`. Per-criterion quotes and labels are leader-reported and verified deterministically by every validator against the fetched page text.

## 7. Status Regression on Re-Verification
Milestone statuses are not permanently locked to positive outcomes. If a milestone previously marked `DELIVERED` is re-verified at a later time against an updated page that contradicts the criteria or removes the evidence, the milestone's `latest_status` can regress to `MISSED`, `PARTIAL`, or `REVIEW`.

## 8. Fictional Fixtures
All test suites, fixtures, and on-chain verification demonstrations use a fictional project named "Lumen Notes". No real organizations, software repositories, or entities are evaluated.
