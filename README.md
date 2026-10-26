# Roadmap Receipts

> **Status**: Preview  
> **Network**: GenLayer Studionet (Chain ID 61999)  
> **License**: MIT (c) 2026 Hyper

Roadmap Receipts transforms project roadmap commitments into verifiable on-chain delivery receipts. A project creator registers an immutable roadmap containing up to 6 milestones with plain-words criteria, weights, and static public evidence URLs. Anyone can invoke verification: decentralized GenLayer validators fetch the evidence page, evaluate each criterion with language model assistance, verify supporting quotes verbatim in code, and compute deterministic milestone statuses and progress scores. A companion grant contract, `TrancheGate`, manages milestone-gated credit disbursements bound to the exact roadmap specification by hash.

---

## The Problem
Grant programs and project roadmaps often suffer from accountability friction. Roadmaps are stated promises that are rarely audited systematically, while grant tranches are typically unlocked either on the unverified say-so of recipients or through subjective, slow committee reviews. When funding councils experience reviewer fatigue or grant recipients modify deliverable criteria after approval, capital allocation suffers.

## The Mechanism
1. **Immutable Roadmap Registration**:
   A creator registers a roadmap with 1-6 milestones in `RoadmapLedger`. Milestone titles, plain-words criteria, and weights are permanently immutable. The evidence URL can only be updated within the identical host and directory path. A canonical `milestones_hash` binds the roadmap structure.
2. **Decentralized Verification Pipeline**:
   Calling `verify(roadmap_id, milestone_index)` triggers GenLayer validator execution:
   - Fetches the public static evidence page via `gl.nondet.web.get`.
   - Checks an injection tripwire; if triggered, execution halts immediately and sets the milestone to `REVIEW`.
   - Executes a structured language model prompt where the evidence text is treated strictly as data.
   - Strictly parses model outputs: each criterion receives a label (`YES`, `PARTIAL`, `NO`, `UNCLEAR`) and a supporting quote.
   - Deterministic quote check: every `YES` or `PARTIAL` quote must appear verbatim in the cleaned evidence page (minimum 8 normalized characters at token boundaries); unverified quotes downgrade the label to `UNCLEAR`.
   - Computes deterministic milestone status (`DELIVERED`, `PARTIAL`, `MISSED`, `REVIEW`) and integer delivery scores (`progress_pct`).
3. **Consensus Token**:
   Validators reach consensus on a compact token: `<STATUS>|<norm_hash16>`. Quotes and labels remain leader-reported and deterministic code verifies them on every validator.
4. **Grant Tranche Gate (`TrancheGate`)**:
   Funders create milestone-gated credit tranches. Tranches release only when the corresponding milestone has achieved `DELIVERED` status and the ledger's current `milestones_hash` strictly matches the grant's recorded hash.

---

## Why GenLayer
Traditional blockchains (EVM/Solidity) cannot read arbitrary external web pages or evaluate natural language statements without centralized oracle intermediaries or subjective multi-signature committees. GenLayer validators execute non-deterministic web fetches and language model inference inside intelligent contract execution, achieving consensus on the result while enforcing deterministic post-processing.

---

## Non-Goals & Limitations
- **Demo Credits Only**: `TrancheGate` and `RoadmapLedger` track internal accounting units. No fiat currency, tokens, or monetary assets are held or transferred.
- **Text Statement vs Software Operation**: The contract verifies what a public static page states; it does not verify whether external compiled binaries or web apps function.
- **Static Pages Only**: Evidence documents must be static text/HTML returning HTTP 200 (150 chars minimum, 100 KB maximum). JavaScript-rendered applications or password-protected pages are not supported.
- **No Temporal Deadlines**: The contract does not feature an on-chain clock, expiration timers, or "late" statuses; evaluation occurs when `verify` is called.
- **Owner File Selection**: The project owner may update the evidence URL within the registered host and directory path. The owner selects which file in that directory represents the release evidence.
- **Status Mutability on Re-Verification**: If a re-verification is triggered on a page where evidence was modified or removed, the milestone status may regress.
- **Fictional Test Fixtures**: All demonstrations and automated test suites reference the fictional project "Lumen Notes".

For complete architectural details, see [docs/DESIGN.md](docs/DESIGN.md), [docs/LIMITATIONS.md](docs/LIMITATIONS.md), and [docs/PRIOR_ART.md](docs/PRIOR_ART.md).

---

## Repository Structure
```
├── contracts/
│   ├── RoadmapLedger.py       # Core roadmap ledger intelligent contract
│   └── TrancheGate.py         # Grant credit gate with synchronous view calls
├── docs/
│   ├── DESIGN.md              # Architectural specification and consensus rationale
│   ├── LIMITATIONS.md         # Full limitations and trust boundaries
│   ├── PRIOR_ART.md           # Comparative analysis against Karma GAP
│   ├── INTEGRATION.md         # Frontend developer guide and view schemas
│   ├── RUNTIME_NOTES.md       # Studionet runtime probe results
│   ├── VERIFICATION.md        # Source code deployment and verification details
│   ├── ROBUSTNESS.md          # Model robustness evaluation log
│   └── EXPECTED_VS_ACTUAL.md  # Pre-registered vs actual verification records
├── fixtures/
│   ├── EXPECTED.md            # Pre-registered fixture expectations
│   └── pages/                 # Local copy of static test pages
├── scripts/
│   ├── scan_ascii.py          # Pure ASCII validator for contracts
│   ├── scan_banned_words.py   # Compliance scanner for forbidden terminology
│   ├── scan_secrets.py        # Secret and private key detector
│   ├── test_decide_parity.py  # Pure function parity test harness
│   └── report_facts.js        # Automated fact extraction and verification script
└── tests/                     # Unit, property, and mocked consensus test suites
```

---

## Deployments (Studionet Preview)
- **Network**: GenLayer Studionet (Chain ID 61999)
- **RPC URL**: `https://studio.genlayer.com/api`
- **RoadmapLedger Address**: [`0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D`](https://explorer-studio.genlayer.com/address/0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D)
- **RoadmapLedger Deploy Tx**: `0x6b58d6a56bc212bac0541ef857028fde452a15d7074acc113843ad974376ddc6` (9.60s latency, `ACCEPTED / SUCCESS`)
- **TrancheGate Address**: [`0x437c45bD60e202Cc7C08C7C4A94e603649750fA8`](https://explorer-studio.genlayer.com/address/0x437c45bD60e202Cc7C08C7C4A94e603649750fA8)
- **TrancheGate Deploy Tx**: `0xc8ed01b1e5ab8cae8fa26cc2ee0786c8d147824f94b65bb3939d34400a708347` (8.89s latency, `ACCEPTED / SUCCESS`)

---

## Testing & Quality Assurance
```bash
# Run unit and mock test suites
python -m unittest discover tests

# Verify pure ASCII compliance
python scripts/scan_ascii.py

# Verify forbidden terminology compliance
python scripts/scan_banned_words.py

# Verify zero committed secrets
python scripts/scan_secrets.py

# Run all checks
npm run check
```

---

## License
MIT License. Copyright (c) 2026 Hyper.
