# On-Chain Source Verification

> **Network**: GenLayer Studionet (Chain ID 61999)  
> **RPC Endpoint**: `https://studio.genlayer.com/api`  
> **RPC Verification Method**: `eth_getTransactionByHash`  
> **Payload Field**: `result.data.contract_code` (base64 decoded ASCII string)  
> **Verification Status**: PASSED (0 diff, byte-for-byte identical)

---

## 1. Verified Deployments

### RoadmapLedger
- **Contract Address**: [`0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D`](https://explorer-studio.genlayer.com/address/0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D)
- **Deployment Transaction**: `0x6b58d6a56bc212bac0541ef857028fde452a15d7074acc113843ad974376ddc6`
- **Deployment Latency**: 9.60s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Local File**: `contracts/RoadmapLedger.py`
- **SHA-256 Digest**: `82c68250dbf7e488ca0fd89dec6f3df23e25d8a1c1d4930b48c7f2c63cb4fd5d`
- **On-Chain Decoded SHA-256**: `82c68250dbf7e488ca0fd89dec6f3df23e25d8a1c1d4930b48c7f2c63cb4fd5d`
- **Diff**: `0 diff (byte-for-byte identical)`

### TrancheGate
- **Contract Address**: [`0x437c45bD60e202Cc7C08C7C4A94e603649750fA8`](https://explorer-studio.genlayer.com/address/0x437c45bD60e202Cc7C08C7C4A94e603649750fA8)
- **Deployment Transaction**: `0xc8ed01b1e5ab8cae8fa26cc2ee0786c8d147824f94b65bb3939d34400a708347`
- **Deployment Latency**: 8.89s (`ACCEPTED`, `MAJORITY_AGREE`, `SUCCESS`)
- **Local File**: `contracts/TrancheGate.py`
- **SHA-256 Digest**: `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`
- **On-Chain Decoded SHA-256**: `8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548`
- **Diff**: `0 diff (byte-for-byte identical)`

---

## 2. Independent Verification Procedure

To independently verify that the on-chain deployed contracts match local source code byte-for-byte:

```bash
node scripts/verify_source.js
```

The script queries `eth_getTransactionByHash` for the deployment transactions, extracts the base64-encoded `contract_code` calldata, decodes it as UTF-8 ASCII, computes the SHA-256 hash, and compares it directly against the local contract files.
