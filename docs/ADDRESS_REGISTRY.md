# Address Registry

This document records the addresses, deployment transaction hashes, source code SHA-256 digests, and operational status of all deployed intelligent contracts on GenLayer Studionet (Chain ID 61999).

---

## 1. Superseded Pair (v1 - Milestone 4 Initial Preview)

The v1 contract pair exhibited an agreement issue during non-deterministic exceptions: when `gl.nondet.web.get` encountered an HTTP 404 status or evidence page text under 150 characters, raising `gl.vm.UserError` directly inside the non-deterministic `run_eval_pipeline()` block prevented validator execution agreement, causing transactions `0xe0117570...` and `0xefc9527a...` to resolve with `UNDETERMINED / MAJORITY_DISAGREE`.

### RoadmapLedger (v1 Superseded)
- **Status**: Superseded
- **Contract Address**: `0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D`
- **Deploy Transaction**: `0x6b58d6a56bc212bac0541ef857028fde452a15d7074acc113843ad974376ddc6`
- **Deploy Latency**: 9.60 s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Source SHA-256**: `82c68250dbf7e488ca0fd89dec6f3df23e25d8a1c1d4930b48c7f2c63cb4fd5d`
- **Explorer**: `https://explorer-studio.genlayer.com/address/0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D`
- **Raw Deploy Payload**: `docs/evidence/source/deploy_tx_RoadmapLedger_v1.json`
- **Extracted Source**: `docs/evidence/source/RoadmapLedger_v1_onchain.py`

### TrancheGate (v1 Superseded)
- **Status**: Superseded
- **Contract Address**: `0x437c45bD60e202Cc7C08C7C4A94e603649750fA8`
- **Deploy Transaction**: `0xc8ed01b1e5ab8cae8fa26cc2ee0786c8d147824f94b65bb3939d34400a708347`
- **Deploy Latency**: 8.89 s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Source SHA-256**: `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`
- **Explorer**: `https://explorer-studio.genlayer.com/address/0x437c45bD60e202Cc7C08C7C4A94e603649750fA8`
- **Bound Ledger Address**: `0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D`
- **Raw Deploy Payload**: `docs/evidence/source/deploy_tx_TrancheGate_v1.json`
- **Extracted Source**: `docs/evidence/source/TrancheGate_v1_onchain.py`

---

## 2. Active Pair (v2 - Canonical Preview)

The v2 contract pair refactors non-deterministic error handling: web fetch HTTP errors and content length validations return an agreed error consensus token (`ERROR|HTTP_<status>` or `ERROR|TOO_SHORT`) from the non-deterministic block. The deterministic post-processing layer then raises the exact `gl.vm.UserError` on every validator, guaranteeing `MAJORITY_AGREE` across all error paths.

### RoadmapLedger (v2 Active)
- **Status**: Active (Canonical)
- **Contract Address**: `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`
- **Deploy Transaction**: `0xc1a3f37d7197d57a126cef7908c309e819c37dc6e9cf5fd6a5ebcd2d8f2101b2`
- **Deploy Latency**: 7.71 s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Source SHA-256**: `daef918508151db2a4a6a0086ace8bee55f39889dd47e4f74b99c6c7fa726aa4`
- **Explorer**: `https://explorer-studio.genlayer.com/address/0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`
- **Raw Deploy Payload**: `docs/evidence/source/deploy_tx_RoadmapLedger_v2.json`
- **Extracted Source**: `docs/evidence/source/RoadmapLedger_v2_onchain.py`

### TrancheGate (v2 Active)
- **Status**: Active (Canonical)
- **Contract Address**: `0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026`
- **Deploy Transaction**: `0x24532e069b090bc7dae24a6dcff25bec180b6af2f4f099491c46de6aae772da9`
- **Deploy Latency**: 8.11 s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Source SHA-256**: `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`
- **Explorer**: `https://explorer-studio.genlayer.com/address/0x5D869C10F523fdD2E3b0Db0CD5CA0107b25b4026`
- **Bound Ledger Address**: `0x711FFC1C4c6ACBea0E7B74B0cd40AF5A5fA5ADa4`
- **Raw Deploy Payload**: `docs/evidence/source/deploy_tx_TrancheGate_v2.json`
- **Extracted Source**: `docs/evidence/source/TrancheGate_v2_onchain.py`
