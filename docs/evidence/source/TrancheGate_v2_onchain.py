# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from genlayer import *


class TrancheGate(gl.Contract):
    ledger_address: Address
    balances: TreeMap[str, str]
    minted: TreeMap[str, str]
    grants: TreeMap[str, str]
    by_funder: TreeMap[str, str]
    by_recipient: TreeMap[str, str]
    meta: TreeMap[str, str]

    def __init__(self, ledger_address_str: str):
        self.ledger_address = Address(ledger_address_str)

    # -----------------------------------------------------------------------
    # Public Views
    # -----------------------------------------------------------------------

    @gl.public.view
    def balance_of(self, addr: str) -> str:
        clean_addr = addr.strip().lower()
        return self.balances.get(clean_addr, "0")

    @gl.public.view
    def get_grant(self, grant_id: str) -> str:
        gid = str(grant_id).strip()
        if gid in self.grants:
            return self.grants[gid]
        return ""

    @gl.public.view
    def list_grants_by_funder(self, addr: str, limit: int = 10) -> list[str]:
        if limit <= 0:
            limit = 10
        if limit > 20:
            limit = 20
        clean_addr = addr.strip().lower()
        if clean_addr not in self.by_funder:
            return []
        try:
            gids = json.loads(self.by_funder[clean_addr])
        except Exception:
            return []
        results = []
        for gid in gids[:limit]:
            if gid in self.grants:
                results.append(self.grants[gid])
        return results

    @gl.public.view
    def list_grants_by_recipient(self, addr: str, limit: int = 10) -> list[str]:
        if limit <= 0:
            limit = 10
        if limit > 20:
            limit = 20
        clean_addr = addr.strip().lower()
        if clean_addr not in self.by_recipient:
            return []
        try:
            gids = json.loads(self.by_recipient[clean_addr])
        except Exception:
            return []
        results = []
        for gid in gids[:limit]:
            if gid in self.grants:
                results.append(self.grants[gid])
        return results

    @gl.public.view
    def is_tranche_open(self, grant_id: str, tranche_index: int) -> str:
        gid = str(grant_id).strip()
        if gid not in self.grants:
            res = {"open": "false", "reason": "NOT_FOUND"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        grant = json.loads(self.grants[gid])
        tranches = grant.get("tranches", [])
        if tranche_index < 0 or tranche_index >= len(tranches):
            res = {"open": "false", "reason": "INDEX_OUT_OF_RANGE"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        tr = tranches[tranche_index]
        if tr.get("released", False):
            res = {"open": "false", "reason": "ALREADY_RELEASED"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        if tr.get("reclaimed", False):
            res = {"open": "false", "reason": "RECLAIMED"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        rid = grant.get("roadmap_id", "")
        stored_hash = grant.get("milestones_hash", "")
        m_idx = tr.get("milestone_index", 0)

        ledger = gl.get_contract_at(self.ledger_address)
        st_raw = ledger.view().get_milestone_status(rid, m_idx)
        if not st_raw:
            res = {"open": "false", "reason": "NOT_FOUND"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        st_data = json.loads(st_raw)
        curr_hash = st_data.get("milestones_hash", "")
        if curr_hash != stored_hash:
            res = {"open": "false", "reason": "ROADMAP_CHANGED"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        curr_status = st_data.get("status", "")
        if curr_status != "DELIVERED":
            res = {"open": "false", "reason": "NOT_DELIVERED"}
            return json.dumps(res, sort_keys=True, separators=(",", ":"))

        res = {"open": "true", "reason": "OK"}
        return json.dumps(res, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_stats(self) -> str:
        tot_minted = self.meta.get("total_minted", "0")
        tot_escrow = self.meta.get("total_escrow", "0")
        next_g = self.meta.get("next_grant", "1")
        total_g = str(int(next_g) - 1)
        res = {
            "total_escrow": tot_escrow,
            "total_grants": total_g,
            "total_minted": tot_minted,
        }
        return json.dumps(res, sort_keys=True, separators=(",", ":"))

    # -----------------------------------------------------------------------
    # Public Writes
    # -----------------------------------------------------------------------

    @gl.public.write
    def claim_demo_credits(self) -> str:
        sender = gl.message.sender_address.as_hex.lower()
        if self.minted.get(sender, "") == "1":
            raise gl.vm.UserError("already claimed demo credits")
        self.minted[sender] = "1"
        curr = int(self.balances.get(sender, "0"))
        new_bal = curr + 1000
        self.balances[sender] = str(new_bal)

        tot = int(self.meta.get("total_minted", "0")) + 1000
        self.meta["total_minted"] = str(tot)
        return str(new_bal)

    @gl.public.write
    def create_grant(self, roadmap_id: str, recipient: str, tranches_json: str) -> str:
        funder = gl.message.sender_address.as_hex.lower()
        recip_clean = recipient.strip().lower()

        if not recip_clean.startswith("0x") or len(recip_clean) != 42:
            raise gl.vm.UserError("invalid recipient address format")
        if recip_clean == funder:
            raise gl.vm.UserError("recipient cannot be funder")

        rid = str(roadmap_id).strip()
        ledger = gl.get_contract_at(self.ledger_address)
        rm_raw = ledger.view().get_roadmap(rid)
        if not rm_raw:
            raise gl.vm.UserError("roadmap does not exist in ledger")

        rm_data = json.loads(rm_raw)
        stored_hash = rm_data.get("milestones_hash", "")
        ms = rm_data.get("milestones", [])
        m_count = len(ms)

        try:
            raw_tr = json.loads(tranches_json)
        except Exception:
            raise gl.vm.UserError("bad tranches JSON: invalid JSON syntax")

        if not isinstance(raw_tr, list):
            raise gl.vm.UserError("bad tranches JSON: must be a list")
        if len(raw_tr) < 1 or len(raw_tr) > 6:
            raise gl.vm.UserError("bad tranches count: must have between 1 and 6 tranches")

        total_amount = 0
        seen_indices = set()
        parsed_tranches = []

        for idx, tr in enumerate(raw_tr):
            if not isinstance(tr, dict):
                raise gl.vm.UserError(f"bad tranche {idx}: must be an object")
            if set(tr.keys()) != {"milestone_index", "amount"}:
                raise gl.vm.UserError(f"bad tranche {idx}: keys must exactly match milestone_index and amount")

            m_idx = tr["milestone_index"]
            amt = tr["amount"]

            if isinstance(m_idx, bool) or not isinstance(m_idx, int):
                raise gl.vm.UserError(f"bad tranche {idx} milestone_index: must be an integer")
            if m_idx < 0 or m_idx >= m_count:
                raise gl.vm.UserError(f"bad tranche {idx} milestone_index: out of roadmap range")
            if m_idx in seen_indices:
                raise gl.vm.UserError(f"duplicate milestone_index {m_idx} in tranches")
            seen_indices.add(m_idx)

            if isinstance(amt, bool) or not isinstance(amt, int):
                raise gl.vm.UserError(f"bad tranche {idx} amount: must be an integer")
            if amt <= 0:
                raise gl.vm.UserError(f"bad tranche {idx} amount: must be positive")

            total_amount += amt
            parsed_tranches.append({
                "amount": str(amt),
                "milestone_index": m_idx,
                "reclaimed": False,
                "released": False,
                "tranche_index": idx,
            })

        funder_bal = int(self.balances.get(funder, "0"))
        if funder_bal < total_amount:
            raise gl.vm.UserError("insufficient balance to fund grant tranches")

        # Debit funder balance and credit escrow
        self.balances[funder] = str(funder_bal - total_amount)
        tot_escrow = int(self.meta.get("total_escrow", "0")) + total_amount
        self.meta["total_escrow"] = str(tot_escrow)

        gid = self.meta.get("next_grant", "1")
        self.meta["next_grant"] = str(int(gid) + 1)

        grant_record = {
            "escrow_balance": str(total_amount),
            "funder": funder,
            "id": gid,
            "milestones_hash": stored_hash,
            "recipient": recip_clean,
            "roadmap_id": rid,
            "schema_version": "1",
            "total_amount": str(total_amount),
            "tranches": parsed_tranches,
        }
        self.grants[gid] = json.dumps(grant_record, sort_keys=True, separators=(",", ":"))

        # Update funder index
        f_list = []
        if funder in self.by_funder:
            try:
                f_list = json.loads(self.by_funder[funder])
            except Exception:
                f_list = []
        f_list = [gid] + [x for x in f_list if x != gid]
        self.by_funder[funder] = json.dumps(f_list[:50], separators=(",", ":"))

        # Update recipient index
        r_list = []
        if recip_clean in self.by_recipient:
            try:
                r_list = json.loads(self.by_recipient[recip_clean])
            except Exception:
                r_list = []
        r_list = [gid] + [x for x in r_list if x != gid]
        self.by_recipient[recip_clean] = json.dumps(r_list[:50], separators=(",", ":"))

        return gid

    @gl.public.write
    def release(self, grant_id: str, tranche_index: int) -> str:
        gid = str(grant_id).strip()
        if gid not in self.grants:
            raise gl.vm.UserError("unknown grant")

        grant = json.loads(self.grants[gid])
        tranches = grant.get("tranches", [])
        if tranche_index < 0 or tranche_index >= len(tranches):
            raise gl.vm.UserError("tranche index out of range")

        tr = tranches[tranche_index]
        if tr.get("released", False):
            raise gl.vm.UserError("tranche already released")
        if tr.get("reclaimed", False):
            raise gl.vm.UserError("tranche already reclaimed")

        rid = grant.get("roadmap_id", "")
        stored_hash = grant.get("milestones_hash", "")
        m_idx = tr.get("milestone_index", 0)

        ledger = gl.get_contract_at(self.ledger_address)
        st_raw = ledger.view().get_milestone_status(rid, m_idx)
        if not st_raw:
            raise gl.vm.UserError("milestone not found in ledger")

        st_data = json.loads(st_raw)
        curr_hash = st_data.get("milestones_hash", "")
        if curr_hash != stored_hash:
            raise gl.vm.UserError("roadmap changed since grant creation")

        curr_status = st_data.get("status", "")
        if curr_status != "DELIVERED":
            if curr_status == "PENDING":
                raise gl.vm.UserError("milestone not delivered: pending")
            elif curr_status == "PARTIAL":
                raise gl.vm.UserError("milestone not delivered: partial")
            elif curr_status == "REVIEW":
                raise gl.vm.UserError("milestone not delivered: review needed")
            elif curr_status == "MISSED":
                raise gl.vm.UserError("milestone not delivered: missed")
            else:
                raise gl.vm.UserError(f"milestone not delivered: {curr_status.lower()}")

        amt = int(tr.get("amount", "0"))
        escrow = int(grant.get("escrow_balance", "0"))
        grant["escrow_balance"] = str(escrow - amt)
        tr["released"] = True
        tranches[tranche_index] = tr
        grant["tranches"] = tranches
        self.grants[gid] = json.dumps(grant, sort_keys=True, separators=(",", ":"))

        tot_escrow = int(self.meta.get("total_escrow", "0")) - amt
        self.meta["total_escrow"] = str(tot_escrow)

        recipient = grant.get("recipient", "")
        recip_bal = int(self.balances.get(recipient, "0")) + amt
        self.balances[recipient] = str(recip_bal)

        return str(recip_bal)

    @gl.public.write
    def reclaim(self, grant_id: str, tranche_index: int) -> str:
        funder = gl.message.sender_address.as_hex.lower()
        gid = str(grant_id).strip()
        if gid not in self.grants:
            raise gl.vm.UserError("unknown grant")

        grant = json.loads(self.grants[gid])
        if grant.get("funder", "").lower() != funder:
            raise gl.vm.UserError("not grant funder")

        tranches = grant.get("tranches", [])
        if tranche_index < 0 or tranche_index >= len(tranches):
            raise gl.vm.UserError("tranche index out of range")

        tr = tranches[tranche_index]
        if tr.get("released", False):
            raise gl.vm.UserError("tranche already released")
        if tr.get("reclaimed", False):
            raise gl.vm.UserError("tranche already reclaimed")

        rid = grant.get("roadmap_id", "")
        stored_hash = grant.get("milestones_hash", "")
        m_idx = tr.get("milestone_index", 0)

        ledger = gl.get_contract_at(self.ledger_address)
        st_raw = ledger.view().get_milestone_status(rid, m_idx)
        if not st_raw:
            raise gl.vm.UserError("milestone not found in ledger")

        st_data = json.loads(st_raw)
        curr_hash = st_data.get("milestones_hash", "")
        if curr_hash != stored_hash:
            raise gl.vm.UserError("roadmap changed since grant creation")

        curr_status = st_data.get("status", "")
        if curr_status != "MISSED":
            raise gl.vm.UserError(f"cannot reclaim: milestone status is {curr_status.lower()}")

        amt = int(tr.get("amount", "0"))
        escrow = int(grant.get("escrow_balance", "0"))
        grant["escrow_balance"] = str(escrow - amt)
        tr["reclaimed"] = True
        tranches[tranche_index] = tr
        grant["tranches"] = tranches
        self.grants[gid] = json.dumps(grant, sort_keys=True, separators=(",", ":"))

        tot_escrow = int(self.meta.get("total_escrow", "0")) - amt
        self.meta["total_escrow"] = str(tot_escrow)

        funder_bal = int(self.balances.get(funder, "0")) + amt
        self.balances[funder] = str(funder_bal)

        return str(funder_bal)
