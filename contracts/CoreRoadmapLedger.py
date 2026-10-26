# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import hashlib
import re
import urllib.parse
import ipaddress
import html
from genlayer import *


def is_ascii_printable(s: str) -> bool:
    if not isinstance(s, str):
        return False
    return all(32 <= ord(c) <= 126 for c in s)


def validate_url(url: str) -> tuple[str, str]:
    if not isinstance(url, str):
        raise gl.vm.UserError("evidence URL must be a string")
    if len(url) > 300:
        raise gl.vm.UserError("evidence URL exceeds 300 characters")
    if not url.startswith("https://"):
        raise gl.vm.UserError("evidence URL must use https scheme")
    
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme.lower() != "https":
        raise gl.vm.UserError("evidence URL must use https scheme")
    if parsed.fragment:
        raise gl.vm.UserError("evidence URL must not contain fragment")
    if parsed.query:
        raise gl.vm.UserError("evidence URL must not contain query parameters")
    if parsed.username or parsed.password:
        raise gl.vm.UserError("evidence URL must not contain userinfo")
    
    if parsed.port is not None and parsed.port != 443:
        raise gl.vm.UserError("evidence URL port must be 443 or omitted")
    
    hostname = parsed.hostname
    if not hostname:
        raise gl.vm.UserError("evidence URL missing valid host")
    
    host_clean = hostname.lower().strip()
    try:
        ipaddress.ip_address(host_clean)
        raise gl.vm.UserError("evidence URL host must not be an IP literal")
    except ValueError:
        pass
    
    if not re.match(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$", host_clean):
        raise gl.vm.UserError("evidence URL host must be a valid public domain name")
    
    path = parsed.path
    if not path or path == "/":
        dir_path = "/"
    else:
        if "/." in path or "\\." in path or "%2e" in path.lower() or "%2f" in path.lower():
            raise gl.vm.UserError("evidence URL path must not contain dot-segments or encoded traversal")
        dir_path = path.rsplit("/", 1)[0] + "/"
        
    return (host_clean, dir_path)


def milestones_hash(milestones: list[dict]) -> str:
    simplified = []
    for m in milestones:
        simplified.append({
            "criteria": m["criteria"],
            "evidence_dir": m["evidence_dir"],
            "evidence_host": m["evidence_host"],
            "index": m["index"],
            "title": m["title"],
            "weight": m["weight"],
        })
    canonical = json.dumps(simplified, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class CoreRoadmapLedger(gl.Contract):
    roadmaps: TreeMap[str, str]
    meta: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.view
    def get_roadmap(self, roadmap_id: str) -> str:
        rid = str(roadmap_id).strip()
        if rid in self.roadmaps:
            return self.roadmaps[rid]
        return ""

    @gl.public.write
    def create_roadmap(self, name: str, milestones_json: str) -> str:
        sender = gl.message.sender_address.as_hex.lower()
        if not is_ascii_printable(name):
            raise gl.vm.UserError("bad roadmap name: must be ASCII printable")
        name_clean = name.strip()
        if len(name_clean) < 3 or len(name_clean) > 60:
            raise gl.vm.UserError("bad roadmap name: length must be between 3 and 60 characters")

        try:
            raw_ms = json.loads(milestones_json)
        except Exception:
            raise gl.vm.UserError("bad milestones JSON: invalid JSON syntax")

        if not isinstance(raw_ms, list):
            raise gl.vm.UserError("bad milestones JSON: must be a JSON array")
        if len(raw_ms) < 1 or len(raw_ms) > 6:
            raise gl.vm.UserError("bad milestones count: must have between 1 and 6 milestones")

        parsed_milestones = []
        common_host = None

        for idx, m in enumerate(raw_ms):
            if not isinstance(m, dict):
                raise gl.vm.UserError(f"bad milestone {idx}: must be an object")
            allowed_keys = {"title", "criteria", "weight", "evidence_url"}
            if set(m.keys()) != allowed_keys:
                raise gl.vm.UserError(f"bad milestone {idx}: keys must exactly match title, criteria, weight, evidence_url")

            title = m["title"]
            if not is_ascii_printable(title):
                raise gl.vm.UserError(f"bad milestone {idx} title: must be ASCII printable")
            title_clean = title.strip()
            if len(title_clean) < 5 or len(title_clean) > 80:
                raise gl.vm.UserError(f"bad milestone {idx} title: length must be between 5 and 80 characters")

            crit = m["criteria"]
            if not isinstance(crit, list) or len(crit) < 1 or len(crit) > 4:
                raise gl.vm.UserError(f"bad milestone {idx} criteria: must be a list of 1 to 4 items")
            clean_crit = []
            for c_idx, c in enumerate(crit):
                if not is_ascii_printable(c):
                    raise gl.vm.UserError(f"bad milestone {idx} criterion {c_idx}: must be ASCII printable")
                c_clean = c.strip()
                if len(c_clean) < 10 or len(c_clean) > 160:
                    raise gl.vm.UserError(f"bad milestone {idx} criterion {c_idx}: length must be between 10 and 160 characters")
                clean_crit.append(c_clean)

            weight = m["weight"]
            if isinstance(weight, bool) or not isinstance(weight, int):
                raise gl.vm.UserError(f"bad milestone {idx} weight: must be an integer")
            if weight < 1 or weight > 10:
                raise gl.vm.UserError(f"bad milestone {idx} weight: must be between 1 and 10")

            ev_url = m["evidence_url"]
            host, dir_path = validate_url(ev_url)
            if common_host is None:
                common_host = host
            elif common_host != host:
                raise gl.vm.UserError("mixed hosts: all milestones must share the same evidence host")

            parsed_milestones.append({
                "criteria": clean_crit,
                "evidence_dir": dir_path,
                "evidence_history": [ev_url],
                "evidence_host": host,
                "evidence_url": ev_url,
                "index": str(idx),
                "latest_status": "PENDING",
                "latest_verification_id": "",
                "title": title_clean,
                "weight": str(weight),
            })

        m_hash = milestones_hash(parsed_milestones)

        current_rid = self.meta.get("next_roadmap", "1")
        next_rid = str(int(current_rid) + 1)
        self.meta["next_roadmap"] = next_rid

        roadmap_record = {
            "id": current_rid,
            "milestones": parsed_milestones,
            "milestones_hash": m_hash,
            "name": name_clean,
            "owner": sender,
            "progress_pct": "0",
            "review_count": "0",
            "schema_version": "1",
            "seq": "1",
            "verified_count": "0",
        }

        self.roadmaps[current_rid] = json.dumps(roadmap_record, sort_keys=True, separators=(",", ":"))
        return current_rid
