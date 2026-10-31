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

    def test_validator_agreement_on_error_tokens(self):
        # Error token: HTTP 404
        error_token = "ERROR|HTTP_404"
        leader_payload = {
            "consensus_token": error_token,
            "error": "HTTP status not 200: 404"
        }
        leader_ret = Return(json.dumps(leader_payload))

        def validator_check_error(ret, my_error_token):
            if not hasattr(ret, "calldata"):
                return False
            try:
                ldata = json.loads(ret.calldata)
                return my_error_token == ldata.get("consensus_token")
            except Exception:
                return False

        # Agreement on identical error token
        self.assertTrue(validator_check_error(leader_ret, "ERROR|HTTP_404"))

        # Disagreement if validator observed different error or status
        self.assertFalse(validator_check_error(leader_ret, "ERROR|HTTP_500"))
        self.assertFalse(validator_check_error(leader_ret, "ERROR|TOO_SHORT"))
        self.assertFalse(validator_check_error(leader_ret, f"DELIVERED|{self.norm_hash16}"))

    def test_validator_agreement_on_too_short_error_token(self):
        error_token = "ERROR|TOO_SHORT"
        leader_payload = {
            "consensus_token": error_token,
            "error": "page unreadable: text under 150 characters"
        }
        leader_ret = Return(json.dumps(leader_payload))

        def validator_check_error(ret, my_error_token):
            if not hasattr(ret, "calldata"):
                return False
            try:
                ldata = json.loads(ret.calldata)
                return my_error_token == ldata.get("consensus_token")
            except Exception:
                return False

        self.assertTrue(validator_check_error(leader_ret, "ERROR|TOO_SHORT"))
        self.assertFalse(validator_check_error(leader_ret, "ERROR|HTTP_404"))


if __name__ == "__main__":
    unittest.main()
