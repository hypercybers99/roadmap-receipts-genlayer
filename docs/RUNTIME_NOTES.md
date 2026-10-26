# Runtime Notes & Milestone 0 Probe Verification

> **Network**: GenLayer Studionet (Chain ID 61999)  
> **RPC Endpoint**: `https://studio.genlayer.com/api`  
> **Probe Contract Address**: `0xc7542202502A3f0E77547bB6238aa227793ebc45`  
> **Deploy Tx Hash**: `0xef75129f2d475ea8b33d9e0e2f46b10a0dcc0803f4a5f9dfa5c2f14061a41e6a`  
> **Probe Source SHA256**: `43e575556dfe3bc1be9ba14ae91b81cb3f91f9dac85dff12d7d68c298ba1fb01`  
> **Throwaway Test Wallet**: `0x3bff817F9f3bB20cbF1a6840D8d70B2291F90616`  

---

## 1. Verified Runtime Capabilities

| Runtime Feature | Probe Result | Verified Behavior |
| :--- | :--- | :--- |
| **Sender Accessor** | `0x3bff817F9f3bB20cbF1a6840D8d70B2291F90616` | `gl.message.sender_address.as_hex` returns mixed-case hex string exactly matching caller address. Storage key comparisons must normalize to `.lower()`. |
| **View Return: `bool`** | `true` | Supported natively; returns boolean value directly. |
| **View Return: `str`** | `"studionet_probe_ok"` | Supported natively; returns UTF-8 string. |
| **View Return: `list[str]`** | `["item_0", "item_1", "item_2"]` | Supported natively; returns list of strings. |
| **View Argument: `int`** | `"int_received:42:int"` | Supported natively; passed as Python integer. |
| **Write Argument: `int`** | `stored_int:100` | Supported natively in `@gl.public.write` transactions. |
| **Module Imports** | `re`, `hashlib`, `json`, `urllib.parse`, `ipaddress`, `html` | All standard library modules import and execute properly at module level in Python runtime. |
| **Storage Capacity** | 10,240 byte payload written & read | `TreeMap[str, str]` reliably stores and retrieves 10KB+ serialized JSON payloads. |
| **Zero-Balance Wallet** | Successful writes with gas price 0 | Throwaway wallets with 0 GEN balance can execute write transactions without funding. |

---

## 2. Web Fetch (`gl.nondet.web.get`) Verification

All tests performed against commit-pinned raw URLs from `roadmap-receipts-fixtures` (commit `c83e8f197f9264701f5362a8e2f13f5e185186e8`):

| Target | URL / Target Type | Status Code | Body Length | Body SHA256 | Consensus Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Markdown Fixture** | `.../lumen/m1-delivered.md` | `200` | 410 bytes | `4138198d3c890bc6f328a30794659fc78ae613b4bfee3d373cd2990261d56abd` | `SUCCESS` (12.01s) |
| **HTML Fixture** | `.../lumen/m1-delivered.html` | `200` | 516 bytes | `cd5488f6be331f325d43a5a5b1d1aca6ebb4c94eead4ba39d90e632b4cd6774d` | `SUCCESS` (15.04s) |
| **404 Missing File** | `.../lumen/nonexistent.md` | `404` | 14 bytes | `d5558cd419c8d46bdc958064cb97f963d1ea793866414c025906ec15033512ed` | `SUCCESS` (11.77s) |
| **Public Website** | `https://example.com` | `200` | 577 bytes | `25ddf2c883e0d1958ea971d279a7e4f0fd446724ee3db7db19dadabd4a62e484` | `SUCCESS` (12.25s) |

### Byte Stability Assessment (Decision Gate)
- Target: 5 consecutive fetches of commit-pinned `m1-delivered.md` inside non-deterministic execution block.
- Result: `stable: true`.
- All 5 hashes: `4138198d3c890bc6f328a30794659fc78ae613b4bfee3d373cd2990261d56abd`.
- All 5 lengths: `410` bytes.
- Latency: 11.69s.
- **DECISION GATE STATUS**: **PASSED**. Static web pages are readable, HTTP statuses are distinct and reliable, and content is byte-stable.

---

## 3. Language Model Inference (`gl.nondet.exec_prompt`) Verification

- Prompt payload: JSON-serialized instruction requesting strict JSON output `{"labels": ["YES"], "quotes": ["Release v0.2.0 ships offline sync to all users."]}`.
- Raw model output:
  `{"labels": ["YES"], "quotes": ["Release v0.2.0 ships offline sync to all users."]}`
- Code fences: None returned by model on this run, but defensive stripping (`replace("```json", "").replace("```", "")`) works as intended.
- Strict parse result: `PARSE_OK`.
- Latency: 18.19s.
- Leader execution result: `SUCCESS`.

---

## 4. Latency Measurements (Measured On-Chain Seconds)

| Action | Transaction Hash | Measured Latency | Leader Execution Result |
| :--- | :--- | :--- | :--- |
| **Deploy Contract** | `0xef75129f2d475ea8b33d9e0e2f46b10a0dcc0803f4a5f9dfa5c2f14061a41e6a` | 9.05 s | `SUCCESS` |
| **Write Integer** | `0x4fc3983acff3de53caa460c1cd573a6b49d151c0f8b3c94c50af0f519149c036` | 8.60 s | `SUCCESS` |
| **Env & 10KB Storage** | `0xe680c0ae55a4ded0d66c6339555eeaf35022ac27ee02c1c40d3ef851340c0c99` | 8.86 s | `SUCCESS` |
| **Web Fetch (.md)** | `0xecbfa4910cf3c880ec015c7e1ae7be26b5e02422501a1dbbfb9821f7535b44fc` | 12.01 s | `SUCCESS` |
| **Web Fetch (.html)** | `0x608dfd50d757d5eeeaee5b7bc4dca1d1c81ef1604a1b0be04443d3b7305987a0` | 15.04 s | `SUCCESS` |
| **Web Fetch (404)** | `0x5d606138f7d9830501a742880c10fc0f8fa573e86c1236875bca61fb4df66675` | 11.77 s | `SUCCESS` |
| **Web Fetch (example.com)** | `0xfb406ce9a826bc4bf33177c4aa9df06114eb31a0e7f78c85ebce91845bb08f0a` | 12.25 s | `SUCCESS` |
| **Byte Stability (5x)** | `0x510d540e1b6f0e3f898198f3957eb0f7bdf7d4f9b87bc4115f5d6f34e8f7fa87` | 11.69 s | `SUCCESS` |
| **exec_prompt (LLM)** | `0x6eef6718cf30a210515152a550eb6fe43a123f8595cb640d24bf5dd1ecf6004d` | 18.19 s | `SUCCESS` |
