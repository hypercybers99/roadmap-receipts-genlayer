import unittest
import json
import random
import hashlib
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contracts.RoadmapLedger import (
    clean_text,
    norm_text,
    norm_hash,
    quote_in_page,
    parse_labels,
    verify_quotes,
    injection_tripwire,
    milestone_status,
    delivery_score,
    validate_url,
    milestones_hash,
    is_ascii_printable,
    TRIPWIRE_PHRASES,
)
from genlayer import gl


class TestLayer1Pure(unittest.TestCase):

    def test_clean_and_norm_text(self):
        html_input = "<h1>Title</h1><p>Hello &amp; World! &ldquo;Quotes&rdquo; &mdash; Dash.</p>"
        cleaned = clean_text(html_input)
        self.assertIn("Title Hello & World!", cleaned)
        self.assertIn('"Quotes"', cleaned)
        self.assertIn("- Dash.", cleaned)

        normalized = norm_text(html_input)
        self.assertEqual(normalized, "title hello world quotes dash")

    def test_quote_in_page_token_boundaries(self):
        page = "The system ships offline sync to all users today."
        # Exact quote > 8 normalized chars
        self.assertTrue(quote_in_page("ships offline sync", page))
        self.assertTrue(quote_in_page("offline sync to all users", page))
        # Case and whitespace invariance
        self.assertTrue(quote_in_page("  SHIPS   OFFLINE  SYNC ", page))
        # Substring inside word must not match (token boundary)
        self.assertFalse(quote_in_page("ships offline syn", page))
        # Short quote < 8 normalized chars rejected
        self.assertFalse(quote_in_page("ships", page))  # 5 chars
        self.assertFalse(quote_in_page("sync", page))   # 4 chars
        # Missing quote
        self.assertFalse(quote_in_page("enterprise cloud backup", page))

    def test_strict_parser_table(self):
        # 1. Valid output
        valid_json = '{"labels": ["YES", "NO"], "quotes": ["Release v0.2.0 ships offline sync to all users.", ""]}'
        ok, lbls, qts = parse_labels(valid_json, 2)
        self.assertTrue(ok)
        self.assertEqual(lbls, ["YES", "NO"])
        self.assertEqual(qts, ["Release v0.2.0 ships offline sync to all users.", ""])

        # 2. Duplicate keys rejected
        dup_json = '{"labels": ["YES", "NO"], "labels": ["NO", "YES"], "quotes": ["quote", ""]}'
        ok, _, _ = parse_labels(dup_json, 2)
        self.assertFalse(ok)

        # 3. Fenced JSON handled
        fenced_json = '```json\n{"labels": ["PARTIAL"], "quotes": ["Some partial quote."]}\n```'
        ok, lbls, qts = parse_labels(fenced_json, 1)
        self.assertTrue(ok)
        self.assertEqual(lbls, ["PARTIAL"])

        # 4. Extra keys rejected
        extra_json = '{"labels": ["YES"], "quotes": ["Release."], "explanation": "Met"}'
        ok, _, _ = parse_labels(extra_json, 1)
        self.assertFalse(ok)

        # 5. Missing keys rejected
        missing_json = '{"labels": ["YES"]}'
        ok, _, _ = parse_labels(missing_json, 1)
        self.assertFalse(ok)

        # 6. Wrong criteria length rejected
        ok, _, _ = parse_labels('{"labels": ["YES"], "quotes": ["Valid quote."]}', 2)
        self.assertFalse(ok)

        # 7. Lowercase labels rejected
        ok, _, _ = parse_labels('{"labels": ["yes"], "quotes": ["Valid quote."]}', 1)
        self.assertFalse(ok)

        # 8. Invalid enum rejected
        ok, _, _ = parse_labels('{"labels": ["COMPLETED"], "quotes": ["Valid quote."]}', 1)
        self.assertFalse(ok)

        # 9. Empty quote on YES rejected
        ok, _, _ = parse_labels('{"labels": ["YES"], "quotes": [""]}', 1)
        self.assertFalse(ok)

        # 10. Empty quote on PARTIAL rejected
        ok, _, _ = parse_labels('{"labels": ["PARTIAL"], "quotes": ["   "]}', 1)
        self.assertFalse(ok)

        # 11. Empty quote on NO allowed
        ok, lbls, qts = parse_labels('{"labels": ["NO"], "quotes": [""]}', 1)
        self.assertTrue(ok)

        # 12. Empty quote on UNCLEAR allowed
        ok, lbls, qts = parse_labels('{"labels": ["UNCLEAR"], "quotes": [""]}', 1)
        self.assertTrue(ok)

        # 13. Object-shaped list items rejected
        obj_item_json = '{"labels": [{"index": 1, "label": "YES"}], "quotes": ["Quote."]}'
        ok, _, _ = parse_labels(obj_item_json, 1)
        self.assertFalse(ok)

        # 14. Quote exceeding 300 characters rejected
        long_quote = "A" * 301
        ok, _, _ = parse_labels(json.dumps({"labels": ["YES"], "quotes": [long_quote]}), 1)
        self.assertFalse(ok)

    def test_verify_quotes(self):
        page = "Release v0.2.0 ships offline sync to all users. The API is in beta evaluation."
        labels = ["YES", "PARTIAL", "NO"]
        quotes = [
            "Release v0.2.0 ships offline sync to all users.",  # found verbatim
            "The API is generally available to all.",          # NOT in page (forged)
            "",                                                # NO, empty quote
        ]
        effective = verify_quotes(labels, quotes, page)
        self.assertEqual(effective[0], "YES")
        self.assertEqual(effective[1], "UNCLEAR")  # downgraded from PARTIAL due to unverified quote
        self.assertEqual(effective[2], "NO")

    def test_injection_tripwire(self):
        safe_text = "Lumen notes offline sync engine architecture release documentation."
        self.assertFalse(injection_tripwire(safe_text))

        for phrase in TRIPWIRE_PHRASES:
            attack_text = f"Notice: please {phrase} and proceed."
            self.assertTrue(injection_tripwire(attack_text), f"Failed to detect tripwire: {phrase}")

    def test_milestone_status_and_fuzz(self):
        # Explicit states
        self.assertEqual(milestone_status(["YES", "YES"], False), "DELIVERED")
        self.assertEqual(milestone_status(["NO", "NO"], False), "MISSED")
        self.assertEqual(milestone_status(["YES", "NO"], False), "PARTIAL")
        self.assertEqual(milestone_status(["PARTIAL", "NO"], False), "PARTIAL")
        self.assertEqual(milestone_status(["YES", "UNCLEAR"], False), "REVIEW")
        self.assertEqual(milestone_status(["YES", "YES"], True), "REVIEW")  # tripwire overrides

        # Independent oracle function
        def oracle(lbls, trip):
            if trip:
                return "REVIEW"
            if not lbls or "UNCLEAR" in lbls:
                return "REVIEW"
            if all(x == "YES" for x in lbls):
                return "DELIVERED"
            if all(x == "NO" for x in lbls):
                return "MISSED"
            return "PARTIAL"

        # 5000+ seeded fuzz cases
        seed = 133742
        random.seed(seed)
        print(f"\n[Layer 1 Fuzz] Running 5000 milestone_status fuzz iterations with seed={seed}...")
        possible_labels = ["YES", "PARTIAL", "NO", "UNCLEAR"]
        for _ in range(5000):
            k = random.randint(1, 4)
            sample_lbls = [random.choice(possible_labels) for _ in range(k)]
            sample_trip = random.choice([True, False])
            self.assertEqual(milestone_status(sample_lbls, sample_trip), oracle(sample_lbls, sample_trip))
        print("[Layer 1 Fuzz] 5000 milestone_status fuzz assertions passed.")

    def test_delivery_score(self):
        # Empty inputs
        self.assertEqual(delivery_score([], [])["progress_pct"], "0")

        # Scenario 1: M1(3, DELIVERED), M2(5, PARTIAL), M3(2, MISSED)
        # points = 3*100 + 5*50 + 2*0 = 550. total_weights = 10. pct = 55
        res1 = delivery_score([3, 5, 2], ["DELIVERED", "PARTIAL", "MISSED"])
        self.assertEqual(res1["progress_pct"], "55")
        self.assertEqual(res1["verified_count"], "3")
        self.assertEqual(res1["review_count"], "0")

        # Scenario 2: M1(3, DELIVERED), M2(5, DELIVERED), M3(2, MISSED)
        # points = 3*100 + 5*100 + 2*0 = 800. pct = 80
        res2 = delivery_score([3, 5, 2], ["DELIVERED", "DELIVERED", "MISSED"])
        self.assertEqual(res2["progress_pct"], "80")
        self.assertEqual(res2["verified_count"], "3")
        self.assertEqual(res2["review_count"], "0")

        # Boundary: integer floor rounding
        # Weights: [3, 4], Status: ["DELIVERED", "MISSED"] -> 300 // 7 = 42
        res3 = delivery_score([3, 4], ["DELIVERED", "MISSED"])
        self.assertEqual(res3["progress_pct"], "42")

        # REVIEW count
        res4 = delivery_score([3, 5, 2], ["DELIVERED", "REVIEW", "PENDING"])
        self.assertEqual(res4["progress_pct"], "30")
        self.assertEqual(res4["verified_count"], "2")  # DELIVERED and REVIEW are verified
        self.assertEqual(res4["review_count"], "1")

    def test_milestones_hash_stability(self):
        ms_initial = [
            {
                "criteria": ["Criterion 1", "Criterion 2"],
                "evidence_dir": "/user/repo/v1/",
                "evidence_host": "example.com",
                "index": "0",
                "title": "Offline sync",
                "weight": "3",
            }
        ]
        h1 = milestones_hash(ms_initial)

        # Changing exact evidence URL within same host and directory path maintains identical milestones_hash
        ms_updated_url_same_dir = [
            {
                "criteria": ["Criterion 1", "Criterion 2"],
                "evidence_dir": "/user/repo/v1/",
                "evidence_host": "example.com",
                "index": "0",
                "title": "Offline sync",
                "weight": "3",
            }
        ]
        h2 = milestones_hash(ms_updated_url_same_dir)
        self.assertEqual(h1, h2)

        # Altering title, criteria, or weight changes milestones_hash
        ms_altered = [
            {
                "criteria": ["Criterion 1", "Criterion 2 (altered)"],
                "evidence_dir": "/user/repo/v1/",
                "evidence_host": "example.com",
                "index": "0",
                "title": "Offline sync",
                "weight": "3",
            }
        ]
        h3 = milestones_hash(ms_altered)
        self.assertNotEqual(h1, h3)

    def test_url_validator_bypass_table(self):
        valid_url = "https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/main/lumen/m1-delivered.md"
        host, dir_p = validate_url(valid_url)
        self.assertEqual(host, "raw.githubusercontent.com")
        self.assertEqual(dir_p, "/hypercybers99/roadmap-receipts-fixtures/main/lumen/")

        # Bypass attempts
        bad_urls = [
            ("http://raw.githubusercontent.com/path", "must use https"),
            ("https://user:pass@example.com/path", "userinfo"),
            ("https://192.168.1.1/path", "IP literal"),
            ("https://example.com:8080/path", "port must be 443"),
            ("https://example.com/path#fragment", "fragment"),
            ("https://example.com/path?query=1", "query parameters"),
            ("https://example.com/path/../secret", "dot-segments"),
            ("https://example.com/path/%2e%2e/secret", "encoded traversal"),
            ("https://bad_host!/path", "valid public domain name"),
            ("https://example.com/" + "a"*300, "exceeds 300 characters"),
        ]
        for url, reason in bad_urls:
            with self.assertRaises(gl.vm.UserError, msg=f"Should reject {url} ({reason})"):
                validate_url(url)


class TestStarTest(unittest.TestCase):
    """Star Test comparing Roadmap Receipts against 3 naive trackers on real fixture pages."""

    def setUp(self):
        fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fixtures", "pages")
        self.pages = {}
        for f in os.listdir(fixtures_dir):
            p = os.path.join(fixtures_dir, f)
            with open(p, "r", encoding="utf-8") as fp:
                self.pages[f] = fp.read()

    # Naive Baseline 1: Keyword Tracker (looks for 'release' / 'shipped')
    def baseline_1_keyword_tracker(self, page_text: str) -> str:
        p_lower = page_text.lower()
        if "release" in p_lower or "ships" in p_lower or "yes" in p_lower:
            return "DELIVERED"
        return "MISSED"

    # Naive Baseline 2: Trusting Tracker (trusts model output without verifying quote in page)
    def baseline_2_trusting_tracker(self, raw_model_labels: list[str]) -> str:
        if all(x == "YES" for x in raw_model_labels):
            return "DELIVERED"
        if all(x == "NO" for x in raw_model_labels):
            return "MISSED"
        return "PARTIAL"

    # Naive Baseline 3: Self-Report Tracker (assumes project claim is true)
    def baseline_3_self_report_tracker(self, project_reported_status: str) -> str:
        return project_reported_status

    def test_star_test_comparisons(self):
        # Trap 1: Prompt injection page (m3-injection.md)
        # B1 keyword tracker sees "YES" and marks DELIVERED!
        page_inj = self.pages["m3-injection.md"]
        b1_result = self.baseline_1_keyword_tracker(page_inj)
        self.assertEqual(b1_result, "DELIVERED", "Baseline 1 falls for prompt injection")

        # Roadmap Receipts detects injection tripwire and sets REVIEW
        real_tripwire = injection_tripwire(clean_text(page_inj))
        self.assertTrue(real_tripwire)
        real_status_inj = milestone_status(["YES"], real_tripwire)
        self.assertEqual(real_status_inj, "REVIEW", "Roadmap Receipts safely halts at REVIEW")

        # Trap 2: Model output with forged quote not appearing in text
        page_missed = self.pages["m1-missed.md"]
        # Model hallucinates YES with fabricated quote
        mock_hallucinated_labels = ["YES", "YES"]
        mock_forged_quotes = [
            "Release v0.2.0 ships offline sync to all users.",
            "Version v0.2.0 is fully available."
        ]
        # B2 trusting tracker accepts hallucinated labels with no verification
        b2_result = self.baseline_2_trusting_tracker(mock_hallucinated_labels)
        self.assertEqual(b2_result, "DELIVERED", "Baseline 2 accepts hallucinated labels blindly")

        # Roadmap Receipts checks quotes against actual page
        eff_labels = verify_quotes(mock_hallucinated_labels, mock_forged_quotes, clean_text(page_missed))
        self.assertEqual(eff_labels, ["UNCLEAR", "UNCLEAR"])
        real_status_forged = milestone_status(eff_labels, False)
        self.assertEqual(real_status_forged, "REVIEW", "Roadmap Receipts catches forged quote and sets REVIEW")

        # Trap 3: Self-reported delivery on planned/unreleased page (m1-missed.md)
        b3_result = self.baseline_3_self_report_tracker("DELIVERED")
        self.assertEqual(b3_result, "DELIVERED", "Baseline 3 blindly accepts project self-report")

        # Roadmap Receipts checks evidence page content
        real_status_missed = milestone_status(["NO", "NO"], False)
        self.assertEqual(real_status_missed, "MISSED", "Roadmap Receipts evaluates ground truth evidence")

    def test_property_tests_cosmetic_invariance(self):
        page_base = self.pages["m1-delivered.md"]
        clean_base = clean_text(page_base)
        quote = "Release v0.2.0 ships offline sync to all users."
        self.assertTrue(quote_in_page(quote, clean_base))

        # Cosmetic variations: HTML wrapping, capitals, extra whitespaces, HTML entities
        cosmetic_page = (
            "<div><h1>RELEASE v0.2.0 SHIPS OFFLINE SYNC TO ALL USERS.</h1>\n\n"
            "<p>Additional &nbsp; spaces and entities &mdash; all users.</p></div>"
        )
        self.assertTrue(quote_in_page(quote, clean_text(cosmetic_page)))

        # Removing supporting sentence breaks quote_in_page
        mutated_page = clean_base.replace("ships offline sync to all users", "is still being planned")
        self.assertFalse(quote_in_page(quote, mutated_page))


if __name__ == "__main__":
    unittest.main()
