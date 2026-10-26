import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tests"))

from contracts.RoadmapLedger import milestone_status, delivery_score


def independent_milestone_status(effective_labels: list[str], tripwire: bool) -> str:
    """Independent reference implementation of milestone status calculation."""
    if tripwire:
        return "REVIEW"
    if not effective_labels or any(lbl == "UNCLEAR" for lbl in effective_labels):
        return "REVIEW"
    if all(lbl == "YES" for lbl in effective_labels):
        return "DELIVERED"
    if all(lbl == "NO" for lbl in effective_labels):
        return "MISSED"
    return "PARTIAL"


parity_cases = [
    # 1. Tripwire True overrides all YES
    (["YES", "YES"], True),
    # 2. Tripwire True overrides all NO
    (["NO", "NO"], True),
    # 3. Tripwire True overrides PARTIAL
    (["YES", "NO"], True),
    # 4. Tripwire True overrides UNCLEAR
    (["UNCLEAR"], True),
    # 5. Empty labels
    ([], False),
    # 6. Single YES
    (["YES"], False),
    # 7. Dual YES
    (["YES", "YES"], False),
    # 8. Triple YES
    (["YES", "YES", "YES"], False),
    # 9. Quad YES
    (["YES", "YES", "YES", "YES"], False),
    # 10. Single NO
    (["NO"], False),
    # 11. Dual NO
    (["NO", "NO"], False),
    # 12. Triple NO
    (["NO", "NO", "NO"], False),
    # 13. Single PARTIAL
    (["PARTIAL"], False),
    # 14. Dual PARTIAL
    (["PARTIAL", "PARTIAL"], False),
    # 15. Mixed YES and NO
    (["YES", "NO"], False),
    # 16. Mixed YES and PARTIAL
    (["YES", "PARTIAL"], False),
    # 17. Mixed NO and PARTIAL
    (["NO", "PARTIAL"], False),
    # 18. Three-way mix YES, PARTIAL, NO
    (["YES", "PARTIAL", "NO"], False),
    # 19. Single UNCLEAR
    (["UNCLEAR"], False),
    # 20. UNCLEAR at head
    (["UNCLEAR", "YES", "YES"], False),
    # 21. UNCLEAR at middle
    (["YES", "UNCLEAR", "NO"], False),
    # 22. UNCLEAR at tail
    (["NO", "NO", "UNCLEAR"], False),
    # 23. Multiple UNCLEAR
    (["UNCLEAR", "UNCLEAR"], False),
    # 24. Four-criteria all NO
    (["NO", "NO", "NO", "NO"], False),
]

print(f"Running parity test across {len(parity_cases)} distinct branch cases...")
for idx, (lbls, trip) in enumerate(parity_cases):
    c_status = milestone_status(lbls, trip)
    e_status = independent_milestone_status(lbls, trip)
    assert c_status == e_status, f"Case {idx + 1} mismatch: contract='{c_status}', external='{e_status}' for {lbls}, tripwire={trip}"

print(f"PASS: All {len(parity_cases)} cases have 100% parity between contract and independent oracle.")
