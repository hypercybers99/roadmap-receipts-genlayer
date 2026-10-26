# Frontend & Developer Integration Guide

> **Target Network**: GenLayer Studionet (Chain ID 61999)  
> **RPC Endpoint**: `https://studio.genlayer.com/api`  
> **Client SDK**: `genlayer-js@^1.1.8`  
> **Status**: Preview  

---

## 1. Network & Receipt Success Rule

A write transaction to GenLayer Studionet is confirmed successful **only** when all three conditions hold:
1. `receipt.status_name === "ACCEPTED"` or `receipt.status_name === "FINALIZED"`
2. `receipt.result_name === "MAJORITY_AGREE"`
3. `receipt.consensus_data.leader_receipt[0].execution_result === "SUCCESS"`

```javascript
import { createClient, chains, createAccount } from 'genlayer-js';

const client = createClient({
  chain: chains.studionet,
  account: userAccount,
});

const txHash = await client.writeContract({
  address: ROADMAP_LEDGER_ADDRESS,
  functionName: 'verify',
  args: ["1", 0],
});

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  retries: 120,
  interval: 3000,
});

const isSuccess = (
  (receipt.status_name === 'ACCEPTED' || receipt.status_name === 'FINALIZED') &&
  receipt.result_name === 'MAJORITY_AGREE' &&
  receipt.consensus_data?.leader_receipt?.[0]?.execution_result === 'SUCCESS'
);

if (!isSuccess) {
  const errPayload = receipt.consensus_data?.leader_receipt?.[0]?.result?.payload;
  const decodedErr = errPayload ? Buffer.from(errPayload, 'base64').toString('utf8') : 'Unknown error';
  throw new Error(`Write failed: ${decodedErr}`);
}
```

---

## 2. RoadmapLedger Contract API

### Public Methods (Writes)

#### `create_roadmap(name: str, milestones_json: str) -> str`
- **Description**: Registers a new immutable roadmap with 1 to 6 milestones.
- **Arguments**:
  - `name`: ASCII string between 3 and 60 characters.
  - `milestones_json`: Serialized JSON array of 1 to 6 milestone objects.
- **Example Call**:
  ```javascript
  const milestones = [
    {
      title: "Offline sync",
      criteria: [
        "A release note states that offline sync is available to all users.",
        "The release note names the version number that includes offline sync."
      ],
      weight: 3,
      evidence_url: "https://raw.githubusercontent.com/user/fixtures/main/lumen/m1-delivered.md"
    }
  ];
  const txHash = await client.writeContract({
    address: LEDGER_ADDRESS,
    functionName: 'create_roadmap',
    args: ["Lumen Notes Roadmap", JSON.stringify(milestones)],
  });
  ```
- **Returns**: Roadmap ID string (e.g. `"1"`).

#### `update_evidence(roadmap_id: str, milestone_index: int, new_url: str) -> None`
- **Description**: Updates the evidence URL of a milestone strictly within the same host and directory path.
- **Permissions**: Creator / owner only.
- **Arguments**:
  - `roadmap_id`: String ID of roadmap.
  - `milestone_index`: Integer milestone index (0 to N-1).
  - `new_url`: Valid HTTPS URL matching stored `evidence_host` and `evidence_dir`.

#### `verify(roadmap_id: str, milestone_index: int) -> str`
- **Description**: Triggers decentralized non-deterministic verification pipeline. Anyone may call.
- **Returns**: Verification ID string (e.g. `"1"`).
- **Latency**: ~12s for tripwire-gated calls; ~18-35s for model-judged calls.

---

### Public Views (Reads)

#### `get_roadmap(roadmap_id: str) -> str`
- **Returns**: Canonical JSON representation of roadmap.
- **Example Response**:
  ```json
  {
    "id": "1",
    "milestones": [
      {
        "criteria": [
          "A release note states that offline sync is available to all users.",
          "The release note names the version number that includes offline sync."
        ],
        "evidence_dir": "/hypercybers99/fixtures/main/lumen/",
        "evidence_history": [
          "https://raw.githubusercontent.com/hypercybers99/fixtures/main/lumen/m1-delivered.md"
        ],
        "evidence_host": "raw.githubusercontent.com",
        "evidence_url": "https://raw.githubusercontent.com/hypercybers99/fixtures/main/lumen/m1-delivered.md",
        "index": "0",
        "latest_status": "DELIVERED",
        "latest_verification_id": "1",
        "title": "Offline sync",
        "weight": "3"
      }
    ],
    "milestones_hash": "ad355d7cb90f8e15ae6bc81fafa462161f3eafbe0f25f89448fd40354e363528",
    "name": "Lumen Notes Roadmap",
    "owner": "0x9459a84b747873f249b92909fff350ab3f55dff9",
    "progress_pct": "30",
    "review_count": "0",
    "schema_version": "1",
    "seq": "2",
    "verified_count": "1"
  }
  ```

#### `get_verification(verification_id: str) -> str`
- **Returns**: Canonical JSON representation of verification receipt.
- **Example Response**:
  ```json
  {
    "caller": "0x9459a84b747873f249b92909fff350ab3f55dff9",
    "effective_labels": ["YES", "YES"],
    "evidence_url_used": "https://raw.githubusercontent.com/hypercybers99/fixtures/main/lumen/m1-delivered.md",
    "gate": "",
    "id": "1",
    "labels": ["YES", "YES"],
    "leader_reported": "true",
    "milestone_index": "0",
    "norm_hash16": "4138198d3c890bc6",
    "quotes": [
      "Release v0.2.0 ships offline sync to all users.",
      "Release v0.2.0 ships offline sync to all users."
    ],
    "roadmap_id": "1",
    "schema_version": "1",
    "seq": "1",
    "status": "DELIVERED",
    "tripwire": false
  }
  ```

#### `get_milestone_status(roadmap_id: str, milestone_index: int) -> str`
- **Description**: Compact binding view read by `TrancheGate`.
- **Returns**:
  ```json
  {
    "milestone_index": "0",
    "milestones_hash": "ad355d7cb90f8e15ae6bc81fafa462161f3eafbe0f25f89448fd40354e363528",
    "roadmap_id": "1",
    "status": "DELIVERED",
    "verification_id": "1"
  }
  ```

---

## 3. TrancheGate Contract API

### Public Methods (Writes)

#### `claim_demo_credits() -> str`
- **Description**: Claims 1,000 demo credits (internal accounting units, no monetary value). One-time per address.

#### `create_grant(roadmap_id: str, recipient: str, tranches_json: str) -> str`
- **Description**: Locks credits in escrow tied to roadmap milestone delivery.
- **Arguments**:
  - `roadmap_id`: Roadmap string ID.
  - `recipient`: 42-char 0x address.
  - `tranches_json`: JSON array of `{"milestone_index": n, "amount": a}` objects.
- **Returns**: Grant ID string.

#### `release(grant_id: str, tranche_index: int) -> str`
- **Description**: Releases credit tranche to recipient if milestone status is `DELIVERED`. Anyone may call.
- **Returns**: Recipient's updated credit balance.

#### `reclaim(grant_id: str, tranche_index: int) -> str`
- **Description**: Reclaims credit tranche back to funder if milestone status is `MISSED`. Funder only.
- **Returns**: Funder's updated credit balance.

---

### Public Views (Reads)

#### `is_tranche_open(grant_id: str, tranche_index: int) -> str`
- **Returns**:
  ```json
  {
    "open": "true",
    "reason": "OK"
  }
  ```
  Possible reasons: `OK`, `ALREADY_RELEASED`, `NOT_DELIVERED`, `ROADMAP_CHANGED`, `RECLAIMED`, `NOT_FOUND`, `INDEX_OUT_OF_RANGE`.
