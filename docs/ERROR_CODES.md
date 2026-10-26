# Error Codes & UserError Catalog

This document specifies the exact error strings raised via `gl.vm.UserError` across `RoadmapLedger` and `TrancheGate` on GenLayer Studionet. Every user failure condition produces an explicit, unique message asserted across the unit and mocked test suites.

---

## 1. RoadmapLedger Error Strings

### Roadmap Creation (`create_roadmap`)
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `bad roadmap name: must be ASCII printable` | Roadmap name contains non-printable or non-ASCII characters | Use standard printable ASCII characters (codes 32-126) |
| `bad roadmap name: length must be between 3 and 60 characters` | Name is shorter than 3 or longer than 60 characters | Adjust name length to within 3 to 60 characters |
| `bad milestones JSON: invalid JSON syntax` | `milestones_json` fails JSON deserialization | Provide syntactically valid JSON array string |
| `bad milestones JSON: must be a JSON array` | Decoded payload is not a JSON list | Wrap milestones inside `[...]` |
| `bad milestones count: must have between 1 and 6 milestones` | Milestone array has 0 or > 6 items | Supply between 1 and 6 milestones |
| `bad milestone {idx}: must be an object` | Array item is not a JSON object | Format each milestone as a JSON dict |
| `bad milestone {idx}: keys must exactly match title, criteria, weight, evidence_url` | Missing or unexpected keys in milestone object | Ensure exact key set: `title`, `criteria`, `weight`, `evidence_url` |
| `bad milestone {idx} title: must be ASCII printable` | Milestone title contains non-ASCII characters | Provide ASCII-only title |
| `bad milestone {idx} title: length must be between 5 and 80 characters` | Milestone title < 5 or > 80 characters | Adjust title length to 5-80 chars |
| `bad milestone {idx} criteria: must be a list of 1 to 4 items` | Criteria array has 0 or > 4 items | Include 1 to 4 criteria strings |
| `bad milestone {idx} criterion {c_idx}: must be ASCII printable` | Criterion string contains non-ASCII characters | Format criterion with printable ASCII |
| `bad milestone {idx} criterion {c_idx}: length must be between 10 and 160 characters` | Criterion < 10 or > 160 characters | Adjust criterion length to 10-160 chars |
| `bad milestone {idx} weight: must be an integer` | Weight is not a Python integer (or is a boolean) | Provide integer weight value |
| `bad milestone {idx} weight: must be between 1 and 10` | Weight integer is < 1 or > 10 | Set integer weight between 1 and 10 |
| `mixed hosts: all milestones must share the same evidence host` | Milestones reference different domain hosts | Ensure all milestones in roadmap share identical host |

### URL Validation (`validate_url`)
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `evidence URL must be a string` | URL argument is not a string | Pass string URL |
| `evidence URL exceeds 300 characters` | URL string length > 300 characters | Use concise URL under 300 chars |
| `evidence URL must use https scheme` | URL uses `http://` or non-https scheme | Host evidence over HTTPS |
| `evidence URL must not contain fragment` | URL includes `#fragment` anchor | Remove `#` fragment |
| `evidence URL must not contain query parameters` | URL includes `?param=val` query string | Remove query parameters |
| `evidence URL must not contain userinfo` | URL contains `user:pass@` prefix | Remove embedded credentials |
| `evidence URL port must be 443 or omitted` | URL specifies non-standard port | Use port 443 or omit port |
| `evidence URL missing valid host` | URL lacks network location / hostname | Specify valid domain |
| `evidence URL host must not be an IP literal` | Host is an IPv4 or IPv6 address literal | Use public DNS domain name |
| `evidence URL host must be a valid public domain name` | Hostname contains invalid characters or lacks TLD | Use standard public domain format |
| `evidence URL path must not contain dot-segments or encoded traversal` | Path includes `..`, `/./`, `%2e%2e`, `%2f` | Use clean canonical path |

### Evidence Updates (`update_evidence`)
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `unknown roadmap` | `roadmap_id` does not exist in `roadmaps` storage | Reference existing roadmap ID |
| `not roadmap owner` | Caller address is not the creator address | Execute update from creator address |
| `milestone index out of range` | Milestone index is negative or >= milestone count | Provide valid index in range |
| `host or directory mismatch` | New URL points to different host or directory path | Keep host and directory path identical |

### Milestone Verification (`verify`)
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `unknown roadmap` | Roadmap ID does not exist | Specify valid roadmap ID |
| `milestone index out of range` | Milestone index out of range | Provide valid index in range |
| `HTTP status not 200: {status}` | Remote server returns non-200 HTTP code | Ensure evidence URL returns HTTP 200 |
| `evidence unreachable: empty body` | Remote response body is 0 bytes | Ensure evidence page serves non-empty text |
| `page too large: exceeds 100000 bytes` | Response body exceeds 100 KB cap | Keep static document under 100 KB |
| `page unreadable: text under 150 characters` | Cleaned text content is less than 150 characters | Provide comprehensive static evidence |
| `duplicate observation: already recorded in verification {vid}` | Exact same page hash and result was already recorded | Re-verification requires updated evidence |

---

## 2. TrancheGate Error Strings

### Credits & Creation
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `already claimed demo credits` | Address has already called `claim_demo_credits` | Demo credits are one-time per address |
| `invalid recipient address format` | Recipient address is not 0x hex string of length 42 | Provide standard 42-character 0x address |
| `recipient cannot be funder` | Funder attempts to designate themselves as recipient | Designate distinct recipient address |
| `roadmap does not exist in ledger` | Synchronous view call to ledger returns empty for roadmap ID | Create grant against existing roadmap ID |
| `bad tranches JSON: invalid JSON syntax` | `tranches_json` string is malformed | Pass valid JSON array string |
| `bad tranches JSON: must be a list` | Decoded payload is not a list | Wrap tranches in `[...]` |
| `bad tranches count: must have between 1 and 6 tranches` | Tranches count is 0 or > 6 | Supply 1 to 6 tranches |
| `bad tranche {idx}: must be an object` | Tranche item is not an object | Format each tranche as a dictionary |
| `bad tranche {idx}: keys must exactly match milestone_index and amount` | Tranche keys do not match expected schema | Supply exact keys `milestone_index` and `amount` |
| `bad tranche {idx} milestone_index: must be an integer` | Milestone index is not an integer | Use integer milestone index |
| `bad tranche {idx} milestone_index: out of roadmap range` | Milestone index >= roadmap milestone count | Use milestone index within roadmap range |
| `duplicate milestone_index {m_idx} in tranches` | Multiple tranches bind to same milestone index | Assign each tranche to a distinct milestone |
| `bad tranche {idx} amount: must be an integer` | Tranche amount is not integer | Specify integer credit amount |
| `bad tranche {idx} amount: must be positive` | Tranche amount <= 0 | Provide positive credit amount |
| `insufficient balance to fund grant tranches` | Funder balance < sum of tranche amounts | Claim demo credits or reduce total tranche sum |

### Release & Reclaim
| Error Message | Cause / Trigger | Resolution |
| :--- | :--- | :--- |
| `unknown grant` | Grant ID does not exist | Specify valid grant ID |
| `tranche index out of range` | Tranche index is out of bounds | Provide valid tranche index |
| `tranche already released` | Tranche has already been released | Released tranches cannot be released again |
| `tranche already reclaimed` | Tranche has already been reclaimed | Reclaimed tranches cannot be released |
| `milestone not found in ledger` | Cross-contract view call cannot locate milestone | Verify ledger address and milestone index |
| `roadmap changed since grant creation` | Ledger's `milestones_hash` does not match grant's stored hash | Roadmaps bound to grants cannot be altered |
| `milestone not delivered: pending` | Milestone has not yet been verified | Execute `verify` on roadmap milestone |
| `milestone not delivered: partial` | Milestone achieved `PARTIAL` status | Requires full `DELIVERED` status for release |
| `milestone not delivered: review needed` | Milestone in `REVIEW` due to injection or unverified quote | Resolve review state on roadmap |
| `milestone not delivered: missed` | Milestone evaluated as `MISSED` | Funder may reclaim missed tranches |
| `not grant funder` | Non-funder attempts to call `reclaim` | Only the grant creator can reclaim |
| `cannot reclaim: milestone status is {status}` | Funder attempts to reclaim tranche for non-MISSED milestone | Reclaim is permitted strictly when milestone status is `MISSED` |
