const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("=================================================================");
  console.log("ROADMAP RECEIPTS: MILESTONE 4 COMPLETE ON-CHAIN EVIDENCE");
  console.log("=================================================================");

  const account = createAccount();
  console.log("Generated primary throwaway account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const evidenceDir = path.join(__dirname, '../../docs/evidence');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });

  const receipts = [];
  const readBacks = {};

  function recordTx(action, txHash, rcpt, latency) {
    const lRes = rcpt.consensus_data?.leader_receipt?.[0]?.execution_result;
    const item = {
      action,
      txHash,
      status_name: rcpt.status_name,
      result_name: rcpt.result_name,
      leader_result: lRes,
      latency_seconds: latency,
    };
    receipts.push(item);
    console.log(`  [TX] ${action} (${latency}s) -> status: ${rcpt.status_name}, result: ${rcpt.result_name}, leader: ${lRes}`);
    return item;
  }

  // 1. Deploy RoadmapLedger
  console.log("\n1. Deploying RoadmapLedger...");
  const ledgerPath = path.join(__dirname, '../../contracts/RoadmapLedger.py');
  const ledgerCode = fs.readFileSync(ledgerPath, 'utf8');
  const ledgerSha = crypto.createHash('sha256').update(ledgerCode, 'utf8').digest('hex');

  const tDeploy1 = Date.now();
  const txDeployLedger = await client.deployContract({ code: ledgerCode, args: [] });
  const rcptLedger = await client.waitForTransactionReceipt({ hash: txDeployLedger, retries: 120, interval: 3000 });
  const latDeployLedger = ((Date.now() - tDeploy1) / 1000).toFixed(2);
  const ledgerAddress = rcptLedger.recipient;
  recordTx("deploy_roadmap_ledger", txDeployLedger, rcptLedger, latDeployLedger);
  console.log("  RoadmapLedger Address:", ledgerAddress);

  // 2. Deploy TrancheGate
  console.log("\n2. Deploying TrancheGate bound to RoadmapLedger...");
  const gatePath = path.join(__dirname, '../../contracts/TrancheGate.py');
  const gateCode = fs.readFileSync(gatePath, 'utf8');
  const gateSha = crypto.createHash('sha256').update(gateCode, 'utf8').digest('hex');

  const tDeploy2 = Date.now();
  const txDeployGate = await client.deployContract({ code: gateCode, args: [ledgerAddress] });
  const rcptGate = await client.waitForTransactionReceipt({ hash: txDeployGate, retries: 120, interval: 3000 });
  const latDeployGate = ((Date.now() - tDeploy2) / 1000).toFixed(2);
  const gateAddress = rcptGate.recipient;
  recordTx("deploy_tranche_gate", txDeployGate, rcptGate, latDeployGate);
  console.log("  TrancheGate Address:", gateAddress);

  // Write deployments.json
  const deployments = {
    network: "GenLayer Studionet",
    chain_id: 61999,
    rpc_url: "https://studio.genlayer.com/api",
    explorer_base: "https://explorer-studio.genlayer.com/address/",
    contracts: {
      RoadmapLedger: {
        address: ledgerAddress,
        deploy_tx: txDeployLedger,
        source_sha256: ledgerSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${ledgerAddress}`,
      },
      TrancheGate: {
        address: gateAddress,
        deploy_tx: txDeployGate,
        source_sha256: gateSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${gateAddress}`,
      }
    }
  };
  fs.writeFileSync(path.join(__dirname, 'deployments.json'), JSON.stringify(deployments, null, 2));

  // 3. Create Roadmap 1 (Lumen Notes)
  console.log("\n3. Creating Roadmap 1 with 3 milestones...");
  const fixtureSha = "c83e8f197f9264701f5362a8e2f13f5e185186e8";
  const rawPrefix = `https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/${fixtureSha}/lumen/`;

  const initialMilestones = [
    {
      title: "Offline sync",
      criteria: [
        "A release note states that offline sync is available to all users.",
        "The release note names the version number that includes offline sync."
      ],
      weight: 3,
      evidence_url: `${rawPrefix}m1-delivered.md`
    },
    {
      title: "Public API",
      criteria: [
        "The documentation lists endpoints for notes and for tags.",
        "A release note states that the API is generally available and not in beta."
      ],
      weight: 5,
      evidence_url: `${rawPrefix}m2-partial.md`
    },
    {
      title: "Security audit published",
      criteria: [
        "A published audit report is linked from the page."
      ],
      weight: 2,
      evidence_url: `${rawPrefix}m3-missed.md`
    }
  ];

  const tC1 = Date.now();
  const txCreate1 = await client.writeContract({
    address: ledgerAddress,
    functionName: 'create_roadmap',
    args: ["Lumen Notes Roadmap", JSON.stringify(initialMilestones)],
  });
  const rcptC1 = await client.waitForTransactionReceipt({ hash: txCreate1, retries: 120, interval: 3000 });
  recordTx("create_roadmap_1", txCreate1, rcptC1, ((Date.now() - tC1) / 1000).toFixed(2));

  const rm1Raw = await client.readContract({ address: ledgerAddress, functionName: 'get_roadmap', args: ["1"] });
  readBacks.roadmap_1_initial = JSON.parse(rm1Raw);
  console.log("  Roadmap 1 milestones_hash:", readBacks.roadmap_1_initial.milestones_hash);
  console.log("  Roadmap 1 initial progress_pct:", readBacks.roadmap_1_initial.progress_pct);

  // 4. Verify Milestone 0 (m1-delivered.md) -> expected DELIVERED
  console.log("\n4. Calling verify on Milestone 0 (m1-delivered.md)...");
  const tV0 = Date.now();
  const txV0 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 0] });
  const rcptV0 = await client.waitForTransactionReceipt({ hash: txV0, retries: 120, interval: 3000 });
  recordTx("verify_m0_delivered_md", txV0, rcptV0, ((Date.now() - tV0) / 1000).toFixed(2));

  const v0Raw = await client.readContract({ address: ledgerAddress, functionName: 'get_verification', args: ["1"] });
  readBacks.verification_1 = JSON.parse(v0Raw);
  console.log("  Verification 1 status:", readBacks.verification_1.status);

  // 5. Test Duplicate Observation Error
  console.log("\n5. Testing duplicate observation rejection...");
  try {
    const txDup = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 0] });
    const rcptDup = await client.waitForTransactionReceipt({ hash: txDup, retries: 120, interval: 3000 });
    recordTx("verify_duplicate_expected_error", txDup, rcptDup, "0");
  } catch (err) {
    console.log("  Duplicate observation rejected as expected:", err.message);
  }

  // 6. Verify Milestone 1 (m2-partial.md) -> expected PARTIAL
  console.log("\n6. Calling verify on Milestone 1 (m2-partial.md)...");
  const tV1 = Date.now();
  const txV1 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 1] });
  const rcptV1 = await client.waitForTransactionReceipt({ hash: txV1, retries: 120, interval: 3000 });
  recordTx("verify_m1_partial_md", txV1, rcptV1, ((Date.now() - tV1) / 1000).toFixed(2));

  const v1Raw = await client.readContract({ address: ledgerAddress, functionName: 'get_verification', args: ["2"] });
  readBacks.verification_2 = JSON.parse(v1Raw);
  console.log("  Verification 2 status:", readBacks.verification_2.status);

  // 7. Verify Milestone 2 (m3-missed.md) -> expected MISSED
  console.log("\n7. Calling verify on Milestone 2 (m3-missed.md)...");
  const tV2 = Date.now();
  const txV2 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 2] });
  const rcptV2 = await client.waitForTransactionReceipt({ hash: txV2, retries: 120, interval: 3000 });
  recordTx("verify_m2_missed_md", txV2, rcptV2, ((Date.now() - tV2) / 1000).toFixed(2));

  const v2Raw = await client.readContract({ address: ledgerAddress, functionName: 'get_verification', args: ["3"] });
  readBacks.verification_3 = JSON.parse(v2Raw);
  console.log("  Verification 3 status:", readBacks.verification_3.status);

  // Read back progress_pct after Scenario 1 (M0 DELIVERED, M1 PARTIAL, M2 MISSED -> expected 55)
  const rm1Scenario1 = await client.readContract({ address: ledgerAddress, functionName: 'get_roadmap', args: ["1"] });
  readBacks.roadmap_1_scenario_1 = JSON.parse(rm1Scenario1);
  console.log("  Roadmap 1 Scenario 1 progress_pct (Expected 55):", readBacks.roadmap_1_scenario_1.progress_pct);

  // 8. Walk through update_evidence
  console.log("\n8. Updating evidence to m1-delivered.html and re-verifying...");
  const tUp0 = Date.now();
  const txUp0 = await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 0, `${rawPrefix}m1-delivered.html`],
  });
  const rcptUp0 = await client.waitForTransactionReceipt({ hash: txUp0, retries: 120, interval: 3000 });
  recordTx("update_evidence_m0_html", txUp0, rcptUp0, ((Date.now() - tUp0) / 1000).toFixed(2));

  const tV0Html = Date.now();
  const txV0Html = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 0] });
  const rcptV0Html = await client.waitForTransactionReceipt({ hash: txV0Html, retries: 120, interval: 3000 });
  recordTx("verify_m0_delivered_html", txV0Html, rcptV0Html, ((Date.now() - tV0Html) / 1000).toFixed(2));

  console.log("\nUpdating evidence to m2-delivered.md and re-verifying...");
  const tUp1 = Date.now();
  const txUp1 = await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 1, `${rawPrefix}m2-delivered.md`],
  });
  const rcptUp1 = await client.waitForTransactionReceipt({ hash: txUp1, retries: 120, interval: 3000 });
  recordTx("update_evidence_m1_delivered", txUp1, rcptUp1, ((Date.now() - tUp1) / 1000).toFixed(2));

  const tV1Del = Date.now();
  const txV1Del = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 1] });
  const rcptV1Del = await client.waitForTransactionReceipt({ hash: txV1Del, retries: 120, interval: 3000 });
  recordTx("verify_m1_delivered_md", txV1Del, rcptV1Del, ((Date.now() - tV1Del) / 1000).toFixed(2));

  // Read back progress_pct after Scenario 2 (M0 DELIVERED, M1 DELIVERED, M2 MISSED -> expected 80)
  const rm1Scenario2 = await client.readContract({ address: ledgerAddress, functionName: 'get_roadmap', args: ["1"] });
  readBacks.roadmap_1_scenario_2 = JSON.parse(rm1Scenario2);
  console.log("  Roadmap 1 Scenario 2 progress_pct (Expected 80):", readBacks.roadmap_1_scenario_2.progress_pct);

  // 9. Injection tripwire verification
  console.log("\n9. Updating evidence to m3-injection.md and testing tripwire gate...");
  const tUp2 = Date.now();
  const txUp2 = await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 2, `${rawPrefix}m3-injection.md`],
  });
  const rcptUp2 = await client.waitForTransactionReceipt({ hash: txUp2, retries: 120, interval: 3000 });
  recordTx("update_evidence_m2_injection", txUp2, rcptUp2, ((Date.now() - tUp2) / 1000).toFixed(2));

  const tV2Inj = Date.now();
  const txV2Inj = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 2] });
  const rcptV2Inj = await client.waitForTransactionReceipt({ hash: txV2Inj, retries: 120, interval: 3000 });
  const latV2Inj = ((Date.now() - tV2Inj) / 1000).toFixed(2);
  recordTx("verify_m2_injection_tripwire", txV2Inj, rcptV2Inj, latV2Inj);
  console.log(`  Tripwire latency: ${latV2Inj}s (gated, no model call needed)`);

  const vInjRaw = await client.readContract({ address: ledgerAddress, functionName: 'get_verification', args: ["6"] });
  readBacks.verification_6_tripwire = JSON.parse(vInjRaw);
  console.log("  Verification 6 status:", readBacks.verification_6_tripwire.status, "gate:", readBacks.verification_6_tripwire.gate);

  // 10. Test update_evidence mismatch errors
  console.log("\n10. Testing update_evidence mismatch errors...");
  try {
    const txHostMis = await client.writeContract({
      address: ledgerAddress,
      functionName: 'update_evidence',
      args: ["1", 2, "https://different-host.com/lumen/m3.md"],
    });
    await client.waitForTransactionReceipt({ hash: txHostMis, retries: 120, interval: 3000 });
  } catch (err) {
    console.log("  Host mismatch rejected as expected:", err.message);
  }

  try {
    const txDirMis = await client.writeContract({
      address: ledgerAddress,
      functionName: 'update_evidence',
      args: ["1", 2, `${rawPrefix}otherdir/m3.md`],
    });
    await client.waitForTransactionReceipt({ hash: txDirMis, retries: 120, interval: 3000 });
  } catch (err) {
    console.log("  Directory mismatch rejected as expected:", err.message);
  }

  // 11. Test 404 URL and too-short text errors
  console.log("\n11. Testing 404 URL and text under 150 characters...");
  await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 2, `${rawPrefix}nonexistent.md`],
  });
  try {
    const tx404 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 2] });
    await client.waitForTransactionReceipt({ hash: tx404, retries: 120, interval: 3000 });
  } catch (err) {
    console.log("  404 URL rejected as expected:", err.message);
  }

  await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 2, `${rawPrefix}m3-too-short.md`],
  });
  try {
    const txShort = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 2] });
    await client.waitForTransactionReceipt({ hash: txShort, retries: 120, interval: 3000 });
  } catch (err) {
    console.log("  Too-short text rejected as expected:", err.message);
  }

  // Restore M2 evidence to m3-missed.md and verify to reset status to MISSED
  await client.writeContract({
    address: ledgerAddress,
    functionName: 'update_evidence',
    args: ["1", 2, `${rawPrefix}m3-missed.md`],
  });
  const txRestore = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: ["1", 2] });
  await client.waitForTransactionReceipt({ hash: txRestore, retries: 120, interval: 3000 });

  // 12. TrancheGate Lifecycle & Conservation Invariant
  console.log("\n12. Testing TrancheGate lifecycle and credit conservation...");
  const recipAccount = createAccount();
  const recipientAddr = recipAccount.address;
  console.log("  Designated grant recipient:", recipientAddr);

  // Claim demo credits
  const tClaim = Date.now();
  const txClaim = await client.writeContract({ address: gateAddress, functionName: 'claim_demo_credits', args: [] });
  const rcptClaim = await client.waitForTransactionReceipt({ hash: txClaim, retries: 120, interval: 3000 });
  recordTx("gate_claim_demo_credits", txClaim, rcptClaim, ((Date.now() - tClaim) / 1000).toFixed(2));

  // Create Grant 1 against Roadmap 1: M0(300), M1(400), M2(200)
  const grantTranches = [
    { milestone_index: 0, amount: 300 },
    { milestone_index: 1, amount: 400 },
    { milestone_index: 2, amount: 200 },
  ];
  const tG1 = Date.now();
  const txGrant1 = await client.writeContract({
    address: gateAddress,
    functionName: 'create_grant',
    args: ["1", recipientAddr, JSON.stringify(grantTranches)],
  });
  const rcptGrant1 = await client.waitForTransactionReceipt({ hash: txGrant1, retries: 120, interval: 3000 });
  recordTx("gate_create_grant_1", txGrant1, rcptGrant1, ((Date.now() - tG1) / 1000).toFixed(2));

  // Release Tranche 0 (M0 is DELIVERED) -> moves 300 to recipient
  console.log("  Releasing Tranche 0 (DELIVERED)...");
  const tRel0 = Date.now();
  const txRel0 = await client.writeContract({ address: gateAddress, functionName: 'release', args: ["1", 0] });
  const rcptRel0 = await client.waitForTransactionReceipt({ hash: txRel0, retries: 120, interval: 3000 });
  recordTx("gate_release_tranche_0", txRel0, rcptRel0, ((Date.now() - tRel0) / 1000).toFixed(2));

  // Duplicate release rejection
  try {
    const txDupRel = await client.writeContract({ address: gateAddress, functionName: 'release', args: ["1", 0] });
    await client.waitForTransactionReceipt({ hash: txDupRel, retries: 120, interval: 3000 });
  } catch (err) {
    console.log("  Duplicate release rejected as expected:", err.message);
  }

  // Release Tranche 1 (M1 is DELIVERED) -> moves 400 to recipient
  console.log("  Releasing Tranche 1 (DELIVERED)...");
  const tRel1 = Date.now();
  const txRel1 = await client.writeContract({ address: gateAddress, functionName: 'release', args: ["1", 1] });
  const rcptRel1 = await client.waitForTransactionReceipt({ hash: txRel1, retries: 120, interval: 3000 });
  recordTx("gate_release_tranche_1", txRel1, rcptRel1, ((Date.now() - tRel1) / 1000).toFixed(2));

  // Reclaim Tranche 2 (M2 is MISSED) -> returns 200 to funder
  console.log("  Reclaiming Tranche 2 (MISSED)...");
  const tRec2 = Date.now();
  const txRec2 = await client.writeContract({ address: gateAddress, functionName: 'reclaim', args: ["1", 2] });
  const rcptRec2 = await client.waitForTransactionReceipt({ hash: txRec2, retries: 120, interval: 3000 });
  recordTx("gate_reclaim_tranche_2", txRec2, rcptRec2, ((Date.now() - tRec2) / 1000).toFixed(2));

  // Check conservation invariant
  const funderBal = await client.readContract({ address: gateAddress, functionName: 'balance_of', args: [account.address] });
  const recipBal = await client.readContract({ address: gateAddress, functionName: 'balance_of', args: [recipientAddr] });
  const gateStatsRaw = await client.readContract({ address: gateAddress, functionName: 'get_stats', args: [] });
  const gateStats = JSON.parse(gateStatsRaw);

  readBacks.gate_funder_balance = funderBal;
  readBacks.gate_recipient_balance = recipBal;
  readBacks.gate_stats = gateStats;

  console.log("  Funder balance:", funderBal);
  console.log("  Recipient balance:", recipBal);
  console.log("  Total escrow remaining:", gateStats.total_escrow);
  console.log("  Total minted:", gateStats.total_minted);

  const sumBalances = parseInt(funderBal) + parseInt(recipBal) + parseInt(gateStats.total_escrow);
  console.log(`  Conservation check: ${sumBalances} == ${gateStats.total_minted}`);
  if (sumBalances !== parseInt(gateStats.total_minted)) {
    throw new Error("Conservation invariant failed!");
  }
  console.log("  CONSERVATION INVARIANT VERIFIED!");

  // Save evidence
  fs.writeFileSync(path.join(evidenceDir, 'onchain_receipts.json'), JSON.stringify(receipts, null, 2));
  fs.writeFileSync(path.join(evidenceDir, 'onchain_readbacks.json'), JSON.stringify(readBacks, null, 2));
  console.log("\nMilestone 4 On-Chain Evidence Complete! All artifacts saved.");
}

main().catch((err) => {
  console.error("FATAL ERROR in deploy_and_run_evidence:", err);
  process.exit(1);
});
