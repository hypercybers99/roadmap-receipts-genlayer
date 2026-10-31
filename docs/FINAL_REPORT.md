# Final Evidence & Verification Report: Roadmap Receipts (Studionet Preview)

STATUS: READY

## 1. Active Deployed Contracts (GenLayer Studionet - Chain 61999)

- **RoadmapLedger (v2 Active)**: `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`
  - Deploy Transaction: `0xc1a3f37d7197d57a126cef7908c309e819c37dc6e9cf5fd6a5ebcd2d8f2101b2`
  - Deploy Latency: `7.71s` (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
  - Source SHA-256: `daef918508151db2a4a6a0086ace8bee55f39889dd47e4f74b99c6c7fa726aa4`
  - Explorer: https://explorer-studio.genlayer.com/address/0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4
  - Extracted Source: `docs/evidence/source/RoadmapLedger_v2_onchain.py`
- **TrancheGate (v2 Active)**: `0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026`
  - Deploy Transaction: `0x24532e069b090bc7dae24a6dcff25bec180b6af2f4f099491c46de6aae772da9`
  - Deploy Latency: `8.11s` (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
  - Source SHA-256: `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`
  - Explorer: https://explorer-studio.genlayer.com/address/0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026
  - Bound Ledger Address: `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`
  - Extracted Source: `docs/evidence/source/TrancheGate_v2_onchain.py`
- **ProbeLabels (Robustness Harness)**: `0x100B6857aFD1f4f09FEeBb8652de3D7F686EE487`
  - Deploy Transaction: not measured (latency: `9.02s`)
  - Source SHA-256: `834b2ed4272b38693eac0e683b0bdf671b9dd3bbcfe878f52d87dbd9bdcf48a0`
  - Prompt Template SHA-256: `86875ca2e701277dc603ec588a7c572a1ede60bcdc9290ed592b10aa5b90e76a`
  - Explorer: https://explorer-studio.genlayer.com/address/0x100B6857aFD1f4f09FEeBb8652de3D7F686EE487
- **Superseded Contracts (v1 Preview)**:
  - RoadmapLedger (v1): `0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D` (deploy `0x6b58d6a56bc212bac0541ef857028fde452a15d7074acc113843ad974376ddc6`, sha256 `82c68250dbf7e488ca0fd89dec6f3df23e25d8a1c1d4930b48c7f2c63cb4fd5d`)
  - TrancheGate (v1): `0x437c45bD60e202Cc7C08C7C4A94e603649750fA8` (deploy `0xc8ed01b1e5ab8cae8fa26cc2ee0786c8d147824f94b65bb3939d34400a708347`, sha256 `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`)
  - Full upgrade diagnosis documented in `docs/ADDRESS_REGISTRY.md`.

---

## 2. Robustness Evidence (60 Repeated On-Chain Harness Runs)

Evaluated across 6 commit-pinned fixture pages at `c83e8f197f9264701f5362a8e2f13f5e185186e8` on Studionet:

| Fixture Page | Target Slug | Total Runs | Parse Success (10/10) | Expected Hits (>=9/10) | Outcome Distribution | Pass / Fail |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| `m1-delivered.md` | `m1_delivered_md` | 10 | 10/10 | 10/10 | DELIVERED: 10 | **PASS** |
| `m1-delivered.html` | `m1_delivered_html` | 10 | 10/10 | 10/10 | DELIVERED: 10 | **PASS** |
| `m1-missed.md` | `m1_missed_md` | 10 | 10/10 | 10/10 | MISSED: 10 | **PASS** |
| `m2-partial.md` | `m2_partial_md` | 10 | 10/10 | 10/10 | PARTIAL: 10 | **PASS** |
| `m2-delivered.md` | `m2_delivered_md` | 10 | 10/10 | 10/10 | DELIVERED: 10 | **PASS** |
| `m3-missed.md` | `m3_missed_md` | 10 | 10/10 | 10/10 | MISSED: 10 | **PASS** |

### Robustness Summary:
- **Total Harness Transactions**: 60 distinct on-chain transactions logged in `docs/evidence/robustness_results.json`.
- **Parse Failures**: 0 / 60 (100% strict JSON validity without code fences or formatting noise).
- **Prompt Iterations Required**: 0 (pre-registered prompt achieved 100% pass on first iteration).
- **Target Status Accuracy**: 60 / 60 (100% accuracy).

---

## 3. Harness vs Production Parity & 9-Run Production Sample

### Module-Level Logic & AST Parity:
Verified between `contracts/RoadmapLedger.py` and `contracts/ProbeLabels.py`:
- `build_prompt`: AST Unparsed Match = **TRUE**, Raw SHA-256 = `e4a35d4af616fbf56a8340d04f5f903dec0d910f7849663d34aae825d880cec7`
- `parse_labels`: AST Unparsed Match = **TRUE**, Raw SHA-256 = `356db6fe9ad17faa46ca6a7e06ef9ea28bd7c46d077b39a5a6e48b6cda17fc4d`
- `verify_quotes`: AST Unparsed Match = **TRUE**, Raw SHA-256 = `93065a8efbf4da40d8ddb73e232726bc10d334cb738b40b2d47ed64fa7e3b555`
- `milestone_status`: AST Unparsed Match = **TRUE**, Raw SHA-256 = `c6cbd513cca8129230a2e369d4a254132816ed68a896fada8d2cd644e413ec7d`
- `prompt_template`: AST Match = **TRUE**

### 9-Run Production Sample on Active RoadmapLedger:
Direct verification calls executed on canonical active contract `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`:

| Target Page | Run | Tx Hash | Latency | Status | Production Labels | ProbeLabels Labels | Match? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `m1-delivered.md` | 1 | `0x66c7b4cb13c4ef5e8fb532d8a91ecf5c8a5eb179a6f8b35d5f47e1716767bf03` | 19.86s | `DELIVERED` | `["YES","YES"]` | `["YES","YES"]` | **YES** |
| `m2-partial.md` | 1 | `0x44edbdb669d9386d29be7bd8faa19da876b8f855c6f3bacb76fab546ad20b618` | 44.28s | `PARTIAL` | `["YES","NO"]` | `["YES","NO"]` | **YES** |
| `m3-missed.md` | 1 | `0x2c5554dccf18eb5ca2b81c17691d431b6e9495e778fb5e17dbb9728f64ab4f08` | 53.16s | `MISSED` | `["NO"]` | `["NO"]` | **YES** |
| `m1-delivered.md` | 2 | `0xd0fb06744056b23d6285c3c409294a603503ad235c5c54737b33a695c5b732d3` | 28.17s | `DELIVERED` | `["YES","YES"]` | `["YES","YES"]` | **YES** |
| `m2-partial.md` | 2 | `0x1fd3a6469ae72f46800fd8d97f130837b96d0b574dd67cc1f320911b340176bc` | 19.00s | `PARTIAL` | `["YES","NO"]` | `["YES","NO"]` | **YES** |
| `m3-missed.md` | 2 | `0x25de0ef966668e862c6ffe805a79b56bcd7f3492f5c21b9b30d942feb3f16510` | 19.09s | `MISSED` | `["NO"]` | `["NO"]` | **YES** |
| `m1-delivered.md` | 3 | `0xda6cf31ba32d05a5f66c5f702eb9e0c7ec576555646ef0bfc8be87ce8b7f8a85` | 18.80s | `DELIVERED` | `["YES","YES"]` | `["YES","YES"]` | **YES** |
| `m2-partial.md` | 3 | `0x542b6c0f59d4d0dee0a39362e6228edad5ab167586b299e348372c383e87bade` | 11.66s | `PARTIAL` | `["YES","NO"]` | `["YES","NO"]` | **YES** |
| `m3-missed.md` | 3 | `0xd7d8fa4e805f4201b186be7501a47314bea8c3732151288632b83dca29b36b4a` | 18.85s | `MISSED` | `["NO"]` | `["NO"]` | **YES** |

### Sample vs Harness Agreement:
- **Agreement Rate**: 9 / 9 (**100.0% match** with ProbeLabels harness distributions).
- **Consensus Latency Range**: 11.66s - 53.16s across 9 production verification transactions.

---

## 4. Lifecycle Verification & Pre-Registered Fixture Execution

Executed on active contract pair (`0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4` + `0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026`):

### Milestone Status Parity:
| Milestone / Fixture | Evidence File | Pre-Registered Expected | Actual On-Chain | Gate Type | Match? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M1: Offline sync** | `m1-delivered.md` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M1: Offline sync (HTML)** | `m1-delivered.html` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M1: Offline sync (Missed)**| `m1-missed.md` | `MISSED` | `MISSED` | Standard (LLM + Quote) | **MATCH** |
| **M2: Public API (Partial)** | `m2-partial.md` | `PARTIAL` | `PARTIAL` | Standard (LLM + Quote) | **MATCH** |
| **M2: Public API (Full)** | `m2-delivered.md` | `DELIVERED` | `DELIVERED` | Standard (LLM + Quote) | **MATCH** |
| **M3: Security audit** | `m3-missed.md` | `MISSED` | `MISSED` | Standard (LLM + Quote) | **MATCH** |
| **M3: Injection tripwire** | `m3-injection.md` | `REVIEW` | `REVIEW` | `TRIPWIRE` (Zero LLM) | **MATCH** |
| **M3: Text < 150 chars** | `m3-too-short.md` | `UserError` | `UserError` | Size validation (<150) | **MATCH** |

### Progress Score Readbacks:
- **Initial Progress Score**: Expected `0`, Actual On-Chain `0` (**EXACT MATCH**)
- **Scenario 1 (M1 DELIVERED, M2 PARTIAL, M3 MISSED)**: Expected `55`, Actual On-Chain `55` (**EXACT MATCH**)
- **Scenario 2 (M1 DELIVERED, M2 DELIVERED, M3 MISSED)**: Expected `80`, Actual On-Chain `80` (**EXACT MATCH**)
- **Scenario 3 (M1 DELIVERED, M2 DELIVERED, M3 REVIEW via Tripwire)**: Expected `80`, Actual On-Chain `80` (**EXACT MATCH**)

---

## 5. Reclaim Verification & Credit Conservation Invariant

### Dedicated Reclaim Proof Execution:
Pre-registered in `docs/EXPECTED_RECLAIM.md` and executed on dedicated roadmap and grant:
- **Allocation**: Tranche 0 (300, DELIVERED), Tranche 1 (400, REVIEW), Tranche 2 (200, MISSED).
- **Reclaim Tranche 0 Refusal**: `cannot reclaim: milestone status is delivered` (Refused as expected)
- **Reclaim Tranche 1 Refusal**: `cannot reclaim: milestone status is review` (Refused as expected)
- **Reclaim Tranche 2 (MISSED) Success**: `200` returned to funder. Tx `0x503037fd4fcb3b73f61ac45fdd751f8462c31f45190f73805f66c6006fb9f800` (8.28s).
- **Duplicate Reclaim Refusal**: `tranche already reclaimed` (Refused as expected)
- **Release Tranche 0 (DELIVERED) Success**: `300` transferred to recipient. Tx `0xcd8f08c3f7c7da5334e9e3425900d0fab56c2e9519e59a01fc9f0aa6362d2c1f` (8.10s).

### Conservation Invariant:
`balance_of(funder) + balance_of(recipient) + total_escrow == total_minted`
- **Funder Balance**: `300`
- **Recipient Balance**: `300`
- **Escrow Balance**: `400`
- **Total Minted**: `1000`
- **Invariant Sum**: `300 + 300 + 400 = 1000 == 1000` (**100% CONSERVED - ZERO LEAKAGE**)

---

## 6. Decoded Error Payloads & Deterministic Consensus

All UserErrors across both contracts now reach deterministic consensus (`MAJORITY_AGREE`) with decoded string payloads:

| Action / Step | Tx Hash | status_name | result_name | leader_result | Decoded Error String |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `verify_duplicate_expected_error` | `0x08b0f930f4e66910966b6bb49ea16fb07dcf6a3cf7622c7f03c9836996da000c` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `duplicate observation: already recorded in verification 1` |
| `update_evidence_not_owner_err` | `0x3b27db37f30995fd8cf3d6777d4c4e8a37af18b8cc2f052afc28735f9c8911fd` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `not roadmap owner` |
| `update_evidence_host_mismatch_err` | `0x5884c644a6a8d6da273ce72160aede72b3a3d52404afb666cbdde73915c7d4b8` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `host or directory mismatch` |
| `update_evidence_dir_mismatch_err` | `0x93704b783a0a9194621b9ab82a1232d2478d458c267b0800885aa8244c72318b` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `host or directory mismatch` |
| `verify_404_url_expected_err` | `0x658bd8559ee10acd1187d55dd31b5cc2e1ea8d5c676d55e79f441bc2a82f0bf3` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `HTTP status not 200: 404` |
| `verify_too_short_expected_err` | `0x1e7c2edec199c6db76f31a3d5c403b5be0e71e169bc2bbb0c51c5ec97b55ef4c` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `page unreadable: text under 150 characters` |
| `verify_m2_reset_missed` | `0x52dcbe9025e65b35b67ebda3ffe3262f5d938db91ac4848655dd8fe9a49c1411` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `duplicate observation: already recorded in verification 3` |
| `gate_duplicate_release_expected_err` | `0xcd8008d903db6798372b8636cf1ded67c0b11eb63251aad2e48d1f6ddda35e37` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `tranche already released` |
| `gate_reclaim_tranche_2` | `0x879af6bfcc571fb69669708da761f358d9142128bc56fcd6e17d76e3bcaa75dc` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `cannot reclaim: milestone status is review` |
| `reclaim_delivered_refusal` | `0x5a1421b475029fb1355f285938c7ffcca37ba08acd95f3a559848ab97cc2e4fd` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `cannot reclaim: milestone status is delivered` |
| `reclaim_review_refusal` | `0x4313df3a8ddff633c550a63de30e4fae96220b6d164ec20117dc9e5c02bb17f4` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `cannot reclaim: milestone status is review` |
| `duplicate_reclaim_refusal` | `0x80cd03f77bcabdd7453f8d7b283f2c78fe1cee97e39916f3102f3af58afe5376` | `ACCEPTED` | `MAJORITY_AGREE` | `ERROR` | `tranche already reclaimed` |

### Repeated Error Consensus Validation (3x Runs Each on v2 Pair):
- **3x HTTP 404 URL Error Verifications**:
  - Run 1: `0xf304033f85a47fe1cf2434ef2318106b751a09eb3104c531ae73dc876b3bd04e` (15.00s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"HTTP status not 200: 404"`
  - Run 2: `0x3cba04b2ebf09f181c0e6fbcea9fc2fc2385e187bb242ad64265b7adb1849862` (15.28s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"HTTP status not 200: 404"`
  - Run 3: `0x701df4d440a32c5795f2dad9935cc0d4c439643a0f788010d68df2573f4c286c` (15.25s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"HTTP status not 200: 404"`
- **3x Too-Short Text (< 150 Chars) Error Verifications**:
  - Run 1: `0x23413ee753c83189d49cb700bcae0c5bfee3bf631ae2babb142f2b9e25edb7c0` (15.24s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"page unreadable: text under 150 characters"`
  - Run 2: `0x32aed45b68f5b9d516e91eb2408188e30dc9d1f59072712cebc205890e43c61d` (15.01s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"page unreadable: text under 150 characters"`
  - Run 3: `0xa424a0a726c734b42072ff545159b3e0f515462ae0ebea360df78196f1c007ec` (10.64s) -> `ACCEPTED`, `MAJORITY_AGREE`, error: `"page unreadable: text under 150 characters"`

---

## 7. Contract Source Verification & Byte-For-Byte Parity

| Contract | Address | On-Chain Source SHA-256 | Local Source SHA-256 | Verification Status |
| :--- | :--- | :--- | :--- | :---: |
| **RoadmapLedger (v2)** | `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4` | `daef918508151db2a4a6a0086ace8bee55f39889dd47e4f74b99c6c7fa726aa4` | `daef918508151db2a4a6a0086ace8bee55f39889dd47e4f74b99c6c7fa726aa4` | **byte-for-byte** |
| **TrancheGate (v2)** | `0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026` | `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548` | `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548` | **byte-for-byte** |
| **ProbeLabels** | `0x100B6857aFD1f4f09FEeBb8652de3D7F686EE487` | `834b2ed4272b38693eac0e683b0bdf671b9dd3bbcfe878f52d87dbd9bdcf48a0` | `834b2ed4272b38693eac0e683b0bdf671b9dd3bbcfe878f52d87dbd9bdcf48a0` | **byte-for-byte** |

---

## 8. On-Chain Finalization Status

All 117 distinct transaction hashes recorded across evidence files independently audited via GenLayer RPC (`eth_getTransactionByHash`):
- **Total Transactions Audited**: 117
- **Transactions with Status FINALIZED**: 117 / 117 (100.0%)
- **Transactions with Consensus MAJORITY_AGREE**: 117 / 117 (100.0%)
- **Undetermined or Majority Disagree Transactions**: 0
- Saved in `docs/evidence/finalization/2026-10-31T15-08-45Z.json`.

---

## 9. Testing & Quality Assurance Suite

All verification tools pass with 100% compliance:
- **Unit & Property Tests**: 19 tests in 0.467s (OK).
- **Layer 1 Decision Fuzzing**: 5,000 randomized iterations passed cleanly.
- **Layer 2 Lifecycle State Machine Fuzzing**: 5,000 steps verified invariant preservation.
- **ASCII Compliance**: 5/5 contracts pure ASCII printable.
- **Banned Words Compliance**: 0 violations across code, fixtures, and docs.
- **Secret Scanner**: 0 detected secrets or private keys.
- **Decision Parity**: 24/24 branch conditions in 100% agreement.
- **Harness Parity**: 100% AST agreement across prompt building, parsing, quote verification, and milestone status decision logic.
