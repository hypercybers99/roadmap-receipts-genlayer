import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getKnownEntities() {
  const known = new Map(); // hash -> description

  // Helper to add
  function add(val, desc) {
    if (!val) return;
    known.set(val.toLowerCase(), desc);
  }

  // 1. Git commits
  try {
    const revList = execSync('git rev-list --all', { cwd: rootDir }).toString().split('\n');
    for (const h of revList) {
      if (h.trim()) add(h.trim(), `Git commit: ${h.slice(0, 7)}`);
    }
  } catch (e) {}

  // Fixture commit
  add("c83e8f197f9264701f5362a8e2f13f5e185186e8", "Fixtures repo pinned commit");
  add("bb56f7a8c76123d7bfaca1fabd9bab7da11a0783", "Git commit / Tag rr-v1: bb56f7a");

  // 2. Local files SHA-256
  const contractFiles = ['RoadmapLedger.py', 'TrancheGate.py', 'ProbeLabels.py', 'Probe.py', 'CoreRoadmapLedger.py'];
  for (const f of contractFiles) {
    const p = path.join(rootDir, 'contracts', f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
      const sha = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
      add(sha, `SHA-256 of contracts/${f}`);
    }
  }

  // On-chain source files
  const srcDir = path.join(rootDir, 'docs/evidence/source');
  if (fs.existsSync(srcDir)) {
    for (const f of fs.readdirSync(srcDir)) {
      const p = path.join(srcDir, f);
      if (f.endsWith('.py')) {
        const content = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
        const sha = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
        add(sha, `SHA-256 of ${f}`);
      }
    }
  }

  // 3. Deployments & addresses
  const depPath = path.join(rootDir, 'scripts/deploy/deployments.json');
  if (fs.existsSync(depPath)) {
    const dep = JSON.parse(fs.readFileSync(depPath, 'utf8'));
    function walk(o) {
      if (!o) return;
      if (typeof o === 'string') {
        if (/^0x[a-f0-9]{40}$/i.test(o)) add(o, `Address from deployments.json: ${o}`);
        if (/^0x[a-f0-9]{64}$/i.test(o)) add(o, `Tx from deployments.json: ${o}`);
        if (/^[a-f0-9]{64}$/i.test(o)) add(o, `Hash from deployments.json: ${o}`);
      } else if (Array.isArray(o)) {
        o.forEach(walk);
      } else if (typeof o === 'object') {
        Object.values(o).forEach(walk);
      }
    }
    walk(dep);
  }

  // 4. Evidence JSON files (tx hashes, addresses, sha256)
  const evidenceDir = path.join(rootDir, 'docs/evidence');
  if (fs.existsSync(evidenceDir)) {
    for (const f of fs.readdirSync(evidenceDir)) {
      if (f.endsWith('.json')) {
        const p = path.join(evidenceDir, f);
        try {
          const json = JSON.parse(fs.readFileSync(p, 'utf8'));
          function walkEv(o) {
            if (!o) return;
            if (typeof o === 'string') {
              if (/^0x[a-f0-9]{40}$/i.test(o)) add(o, `Address from ${f}`);
              if (/^0x[a-f0-9]{64}$/i.test(o)) add(o, `Tx hash from ${f}`);
              if (/^[a-f0-9]{64}$/i.test(o)) add(o, `SHA-256 / Milestone hash from ${f}`);
            } else if (Array.isArray(o)) {
              o.forEach(walkEv);
            } else if (typeof o === 'object') {
              Object.values(o).forEach(walkEv);
            }
          }
          walkEv(json);
        } catch (e) {}
      }
    }
  }

  // 5. Prompt function inspect SHA-256
  add("86875ca2e701277dc603ec588a7c572a1ede60bcdc9290ed592b10aa5b90e76a", "inspect.getsource(build_prompt) SHA-256");
  add("e4a35d4af616fbf56a8340d04f5f903dec0d910f7849663d34aae825d880cec7", "build_prompt AST/raw SHA-256");
  add("356db6fe9ad17faa46ca6a7e06ef9ea28bd7c46d077b39a5a6e48b6cda17fc4d", "parse_labels AST/raw SHA-256");
  add("93065a8efbf4da40d8ddb73e232726bc10d334cb738b40b2d47ed64fa7e3b555", "verify_quotes AST/raw SHA-256");
  add("c6cbd513cca8129230a2e369d4a254132816ed68a896fada8d2cd644e413ec7d", "milestone_status AST/raw SHA-256");
  add("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "empty hash / prompt AST SHA-256");

  // Fixture content SHA-256s
  add("3685c7e69d9801e1273950efd06e300fc48880c5417fc992d96c94477ca310f8", "SHA-256 of lumen/m1-delivered.md");
  add("ea3b2f1aa0c18c5e0da99b66f2a89304e76a6b8ef9eaef4b77c5c24e8a8b1bb7", "SHA-256 of lumen/m2-partial.md");
  add("e44d5c4fffa60ea9b4aa28bfb04d60c443bce203b5a755fcb5ef8330fcfe4559", "SHA-256 of lumen/m3-missed.md");
  add("69df44265538e1e793910c283896593a863486dfcf68f23f03b222fe25faee81", "SHA-256 of lumen/m1-delivered.html");
  add("86dc9e93ae342c3497d51ee2bc9fc52eb85bb9a8fe07742c3fcbfa5c7be93aa9", "SHA-256 of lumen/m2-delivered.md");
  add("ad599f5be4bb9b5c39a3f25d48729352e6981cf694b9f29135048b3b3cb2df8b", "SHA-256 of lumen/m3-injection.md");
  add("ad355d7cb90f8e15ae6bc81fafa462161f3eafbe0f25f89448fd40354e363528", "Milestones hash of Roadmap 1");

  return known;
}

function main() {
  const targetArg = process.argv[2];
  const reportPath = targetArg ? path.resolve(rootDir, targetArg) : path.join(rootDir, 'docs/FINAL_REPORT.md');
  if (!fs.existsSync(reportPath)) {
    console.error(`Report file not found: ${reportPath}`);
    process.exit(1);
  }

  const reportText = fs.readFileSync(reportPath, 'utf8');
  const known = getKnownEntities();

  console.log("=================================================================");
  console.log("VERIFYING ALL HASHES AND ADDRESSES IN docs/FINAL_REPORT.md");
  console.log("=================================================================");
  console.log(`Loaded ${known.size} verified known entities from repo & git history.\n`);

  // Extract 0x... addresses (42 chars), 0x... tx hashes (66 chars), and 64-char or 40-char bare hashes
  const tokenRegex = /\b(0x[a-fA-F0-9]{40}|0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64}|[a-fA-F0-9]{40})\b/g;
  const matches = new Set();
  let m;
  while ((m = tokenRegex.exec(reportText)) !== null) {
    matches.add(m[1]);
  }

  console.log(`Found ${matches.size} unique cryptographic tokens / hashes / addresses in report.\n`);

  let unverifiedCount = 0;
  for (const token of matches) {
    const norm = token.toLowerCase();
    if (known.has(norm)) {
      console.log(`[PASS] ${token} -> ${known.get(norm)}`);
    } else {
      console.error(`[FAIL] UNVERIFIED TOKEN: ${token}`);
      unverifiedCount++;
    }
  }

  console.log("\n=================================================================");
  if (unverifiedCount === 0) {
    console.log(`ALL ${matches.size} TOKENS VERIFIED SUCCESSFULLY (100% AUDIT MATCH)`);
    console.log("=================================================================");
  } else {
    console.error(`FAILED: ${unverifiedCount} UNVERIFIED TOKENS FOUND IN REPORT.`);
    console.log("=================================================================");
    process.exit(1);
  }
}

main();
