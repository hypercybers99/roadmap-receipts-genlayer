#!/usr/bin/env python3
import ast
import difflib
import hashlib
import json
import sys

def extract_funcs(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        src = f.read()
    lines = src.splitlines()
    tree = ast.parse(src)
    funcs = {}
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            raw = "\n".join(lines[node.lineno - 1 : node.end_lineno])
            unparsed = ast.unparse(node)
            funcs[node.name] = {
                "node": node,
                "raw": raw,
                "unparsed": unparsed,
                "raw_sha256": hashlib.sha256(raw.encode("utf-8")).hexdigest(),
                "unparsed_sha256": hashlib.sha256(unparsed.encode("utf-8")).hexdigest(),
            }
    return funcs, src

def main():
    rl_funcs, rl_src = extract_funcs("contracts/RoadmapLedger.py")
    pl_funcs, pl_src = extract_funcs("contracts/ProbeLabels.py")

    target_funcs = ["build_prompt", "parse_labels", "verify_quotes", "milestone_status"]
    results = {}

    print("=== AST & FUNCTION-LEVEL PARITY CHECK ===")
    all_match = True
    for name in target_funcs:
        if name not in rl_funcs or name not in pl_funcs:
            print(f"[-] Function {name} missing in one of the contracts")
            all_match = False
            continue

        rl_data = rl_funcs[name]
        pl_data = pl_funcs[name]

        ast_identical = (rl_data["unparsed"] == pl_data["unparsed"])
        raw_identical = (rl_data["raw"] == pl_data["raw"])

        results[name] = {
            "ast_identical": ast_identical,
            "raw_identical": raw_identical,
            "rl_unparsed_sha256": rl_data["unparsed_sha256"],
            "pl_unparsed_sha256": pl_data["unparsed_sha256"],
            "rl_raw_sha256": rl_data["raw_sha256"],
            "pl_raw_sha256": pl_data["raw_sha256"],
        }

        print(f"\nFunction: {name}")
        print(f"  AST Unparsed Match: {ast_identical}")
        print(f"  Raw Source Match:   {raw_identical}")
        print(f"  RL raw SHA-256:     {rl_data['raw_sha256']}")
        print(f"  PL raw SHA-256:     {pl_data['raw_sha256']}")

        if not ast_identical:
            all_match = False
            diff = difflib.unified_diff(
                rl_data["unparsed"].splitlines(keepends=True),
                pl_data["unparsed"].splitlines(keepends=True),
                fromfile="RoadmapLedger." + name,
                tofile="ProbeLabels." + name,
            )
            print("  AST Diff:\n" + "".join(diff))

    # Also extract and compare the prompt template string directly
    print("\n=== PROMPT TEMPLATE STRING PARITY ===")
    # Extract prompt inside build_prompt
    # In both functions, prompt is formed by f-string / template
    rl_prompt_node = None
    pl_prompt_node = None
    for n in ast.walk(rl_funcs["build_prompt"]["node"]):
        if isinstance(n, ast.Assign):
            for t in n.targets:
                if isinstance(t, ast.Name) and t.id == "prompt":
                    rl_prompt_node = n.value
    for n in ast.walk(pl_funcs["build_prompt"]["node"]):
        if isinstance(n, ast.Assign):
            for t in n.targets:
                if isinstance(t, ast.Name) and t.id == "prompt":
                    pl_prompt_node = n.value

    rl_prompt_unparse = ast.unparse(rl_prompt_node) if rl_prompt_node else ""
    pl_prompt_unparse = ast.unparse(pl_prompt_node) if pl_prompt_node else ""

    prompt_match = (rl_prompt_unparse == pl_prompt_unparse)
    print(f"Prompt Template AST Match: {prompt_match}")
    print(f"RL Prompt AST SHA-256: {hashlib.sha256(rl_prompt_unparse.encode('utf-8')).hexdigest()}")
    print(f"PL Prompt AST SHA-256: {hashlib.sha256(pl_prompt_unparse.encode('utf-8')).hexdigest()}")

    results["prompt_template"] = {
        "match": prompt_match,
        "rl_prompt_sha256": hashlib.sha256(rl_prompt_unparse.encode("utf-8")).hexdigest(),
        "pl_prompt_sha256": hashlib.sha256(pl_prompt_unparse.encode("utf-8")).hexdigest(),
    }

    with open("docs/evidence/harness_parity.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    if not all_match or not prompt_match:
        sys.exit(1)
    print("\nParity check passed: 100% semantic agreement across all target evaluation logic.")

if __name__ == "__main__":
    main()
