import unittest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from genlayer import Return


class TestLayer3Consensus(unittest.TestCase):

    def setUp(self):
        self.norm_hash16 = "4138198d3c890bc6"

    def test_validator_agreement_identical_tokens(self):
        leader_token = f"DELIVERED|{self.norm_hash16}"
        leader_payload = {
            "status": "DELIVERED",
            "norm_hash16": self.norm_hash16,
            "consensus_token": leader_token,
            "labels": ["YES", "YES"],
            "quotes": ["Release v0.2.0 ships offline sync.", "Version v0.2.0."],
            "gate": "",
            "tripwire": False,
        }
        leader_ret = Return(json.dumps(leader_payload))

        def validator_check(ret, my_status, my_hash16):
            if not hasattr(ret, "calldata"):
                return False
            try:
                ldata = json.loads(ret.calldata)
                my_token = f"{my_status}|{my_hash16}"
                return my_token == ldata.get("consensus_token")
            except Exception:
                return False

        # 1. Identical token -> validator agrees (True)
        self.assertTrue(validator_check(leader_ret, "DELIVERED", self.norm_hash16))

        # 2. Status differs -> validator disagrees (False)
        self.assertFalse(validator_check(leader_ret, "PARTIAL", self.norm_hash16))
        self.assertFalse(validator_check(leader_ret, "MISSED", self.norm_hash16))
        self.assertFalse(validator_check(leader_ret, "REVIEW", self.norm_hash16))

        # 3. Hash differs -> validator disagrees (False)
        different_hash16 = "9999999999999999"
        self.assertFalse(validator_check(leader_ret, "DELIVERED", different_hash16))

        # 4. Missing / invalid calldata -> validator returns False
        self.assertFalse(validator_check(Return("{invalid json"), "DELIVERED", self.norm_hash16))
        self.assertFalse(validator_check(None, "DELIVERED", self.norm_hash16))


if __name__ == "__main__":
    unittest.main()
