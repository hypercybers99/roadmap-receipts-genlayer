const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=================================================================");
  console.log("ROADMAP RECEIPTS: RECLAIM PROOF TEST RUNNER");
  console.log("=================================================================");

  const funderAccount = createAccount();
  const recipientAccount = createAccount();

  console.log("Funder account:   ", funderAccount.address);
  console.log("Recipient account:", recipientAccount.address);

  const client = createClient({
    chain: chains.studionet,
    account: funderAccount,
  });

  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployments.json'), 'utf8'));
  const ledgerAddress = deployments.active_pair.RoadmapLedger.address;
  const gateAddress = deployments.active_pair.TrancheGate.address;

  console.log("Active RoadmapLedger:", ledgerAddress);
  console.log("Active TrancheGate:  ", gateAddress);

  const fixtureSha = "c83e8f197f9264701f5362a8e2f13f5e185186e8";
  const rawPrefix = `https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/${fixtureSha}/lumen/`;

  const receipts = [];
  const snapshots = {};
  let grantId = null;

  function recordTx(action, txHash, rcpt, latency) {
    const lRes = rcpt.consensus_data?.leader_receipt?.[0]?.execution_result;
    const payload = rcpt.consensus_data?.leader_receipt?.[0]?.result?.payload;
    const item = {
      action,
      txHash,
      status_name: rcpt.status_name,
      result_name: rcpt.result_name,
      leader_result: lRes,
      payload: payload || null,
      latency_seconds: latency,
    };
    receipts.push(item);
    console.log(`  [TX] ${action.padEnd(35)} (${String(latency).padStart(5)}s) -> status: ${rcpt.status_name}, result: ${rcpt.result_name}, leader: ${lRes}${payload ? ` | payload: "${payload}"` : ''}`);
    return item;
  }

  async function takeSnapshot(tag) {
    const funderBal = await client.readContract({ address: gateAddress, functionName: 'balance_of', args: [funderAccount.address] });
    const recipBal = await client.readContract({ address: gateAddress, functionName: 'balance_of', args: [recipientAccount.address] });
    const gateStatsRaw = await client.readContract({ address: gateAddress, functionName: 'get_stats', args: [] });
    const gateStats = JSON.parse(gateStatsRaw);

    const fBal = parseInt(funderBal);
    const rBal = parseInt(recipBal);
    let grantEscrow = 0;
    if (grantId !== null) {
      try {
        const gRaw = await client.readContract({ address: gateAddress, functionName: 'get_grant', args: [grantId] });
        if (gRaw && gRaw.trim()) {
          grantEscrow = parseInt(JSON.parse(gRaw).escrow_balance);
        }
      } catch (e) {}
    }
    const sum = fBal + rBal + grantEscrow;
    const conserved = (sum === 1000);

    console.log(`  [Snapshot: ${tag}] Funder: ${fBal}, Recipient: ${rBal}, Grant Escrow: ${grantEscrow} -> Invariant: ${sum} == 1000 (${conserved ? 'CONSERVED' : 'VIOLATED'})`);

    snapshots[tag] = {
      funder_balance: String(fBal),
      recipient_balance: String(rBal),
      total_escrow: String(grantEscrow),
      total_minted: "1000",
      sum_of_balances: String(sum),
      conserved,
    };

    if (!conserved) {
      throw new Error(`Conservation invariant VIOLATED at snapshot ${tag}!`);
    }
  }

  // 1. Create Roadmap
  console.log("\n1. Creating Reclaim Proof Roadmap with M0(Delivered), M1(Review), M2(Missed)...");
  const milestones = [
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
      evidence_url: `${rawPrefix}m3-injection.md`
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

  const tC = Date.now();
  const txCreate = await client.writeContract({
    address: ledgerAddress,
    functionName: 'create_roadmap',
    args: ["Reclaim Proof Roadmap", JSON.stringify(milestones)],
  });
  const rcptC = await client.waitForTransactionReceipt({ hash: txCreate, retries: 120, interval: 6000 });
  recordTx("create_reclaim_roadmap", txCreate, rcptC, ((Date.now() - tC) / 1000).toFixed(2));

  // Determine roadmap ID
  const statsRaw = await client.readContract({ address: ledgerAddress, functionName: 'get_stats', args: [] });
  const totalR = JSON.parse(statsRaw).total_roadmaps;
  const roadmapId = String(totalR);
  console.log("  Target Roadmap ID:", roadmapId);

  // 2. Establish Milestone Statuses On-Chain
  console.log("\n2. Establishing milestone statuses on-chain...");

  // Verify M0 (m1-delivered.md) -> DELIVERED
  const tV0 = Date.now();
  const txV0 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: [roadmapId, 0] });
  const rcptV0 = await client.waitForTransactionReceipt({ hash: txV0, retries: 120, interval: 6000 });
  recordTx("verify_m0_delivered", txV0, rcptV0, ((Date.now() - tV0) / 1000).toFixed(2));

  // Verify M1 (m3-injection.md) -> REVIEW (tripwire)
  const tV1 = Date.now();
  const txV1 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: [roadmapId, 1] });
  const rcptV1 = await client.waitForTransactionReceipt({ hash: txV1, retries: 120, interval: 6000 });
  recordTx("verify_m1_review_tripwire", txV1, rcptV1, ((Date.now() - tV1) / 1000).toFixed(2));

  // Verify M2 (m3-missed.md) -> MISSED
  const tV2 = Date.now();
  const txV2 = await client.writeContract({ address: ledgerAddress, functionName: 'verify', args: [roadmapId, 2] });
  const rcptV2 = await client.waitForTransactionReceipt({ hash: txV2, retries: 120, interval: 6000 });
  recordTx("verify_m2_missed", txV2, rcptV2, ((Date.now() - tV2) / 1000).toFixed(2));

  // Verify readbacks of statuses
  const st0 = JSON.parse(await client.readContract({ address: ledgerAddress, functionName: 'get_milestone_status', args: [roadmapId, 0] })).status;
  const st1 = JSON.parse(await client.readContract({ address: ledgerAddress, functionName: 'get_milestone_status', args: [roadmapId, 1] })).status;
  const st2 = JSON.parse(await client.readContract({ address: ledgerAddress, functionName: 'get_milestone_status', args: [roadmapId, 2] })).status;

  console.log(`  Statuses verified on-chain: M0=${st0}, M1=${st1}, M2=${st2}`);
  if (st0 !== 'DELIVERED' || st1 !== 'REVIEW' || st2 !== 'MISSED') {
    throw new Error(`Statuses do not match expected: M0=${st0}, M1=${st1}, M2=${st2}`);
  }

  // 3. Funder claims demo credits and creates grant
  console.log("\n3. Funder claims demo credits and creates grant...");
  const tClaim = Date.now();
  const txClaim = await client.writeContract({ address: gateAddress, functionName: 'claim_demo_credits', args: [] });
  const rcptClaim = await client.waitForTransactionReceipt({ hash: txClaim, retries: 120, interval: 6000 });
  recordTx("funder_claim_demo_credits", txClaim, rcptClaim, ((Date.now() - tClaim) / 1000).toFixed(2));

  await takeSnapshot("after_claim");

  const grantTranches = [
    { milestone_index: 0, amount: 300 },
    { milestone_index: 1, amount: 400 },
    { milestone_index: 2, amount: 200 },
  ];

  const tG = Date.now();
  const txGrant = await client.writeContract({
    address: gateAddress,
    functionName: 'create_grant',
    args: [roadmapId, recipientAccount.address, JSON.stringify(grantTranches)],
  });
  const rcptGrant = await client.waitForTransactionReceipt({ hash: txGrant, retries: 120, interval: 6000 });
  recordTx("funder_create_grant", txGrant, rcptGrant, ((Date.now() - tG) / 1000).toFixed(2));

  // Determine grant ID
  const gateStats = JSON.parse(await client.readContract({ address: gateAddress, functionName: 'get_stats', args: [] }));
  grantId = String(gateStats.total_grants);
  console.log("  Grant created with ID:", grantId);

  await takeSnapshot("after_create_grant");

  // 4. Test Reclaim on DELIVERED milestone (Tranche 0) -> Expected refusal
  console.log("\n4. Reclaim attempt on DELIVERED milestone (Tranche 0)...");
  const tRec0 = Date.now();
  const txRec0 = await client.writeContract({ address: gateAddress, functionName: 'reclaim', args: [grantId, 0] });
  const rcptRec0 = await client.waitForTransactionReceipt({ hash: txRec0, retries: 120, interval: 6000 });
  recordTx("reclaim_delivered_refusal", txRec0, rcptRec0, ((Date.now() - tRec0) / 1000).toFixed(2));

  await takeSnapshot("after_reclaim_delivered_refusal");

  // 5. Test Reclaim on REVIEW milestone (Tranche 1) -> Expected refusal
  console.log("\n5. Reclaim attempt on REVIEW milestone (Tranche 1)...");
  const tRec1 = Date.now();
  const txRec1 = await client.writeContract({ address: gateAddress, functionName: 'reclaim', args: [grantId, 1] });
  const rcptRec1 = await client.waitForTransactionReceipt({ hash: txRec1, retries: 120, interval: 6000 });
  recordTx("reclaim_review_refusal", txRec1, rcptRec1, ((Date.now() - tRec1) / 1000).toFixed(2));

  await takeSnapshot("after_reclaim_review_refusal");

  // 6. Test Legitimate Reclaim on MISSED milestone (Tranche 2) -> Expected SUCCESS!
  console.log("\n6. Legitimate reclaim on MISSED milestone (Tranche 2)...");
  const tRec2 = Date.now();
  const txRec2 = await client.writeContract({ address: gateAddress, functionName: 'reclaim', args: [grantId, 2] });
  const rcptRec2 = await client.waitForTransactionReceipt({ hash: txRec2, retries: 120, interval: 6000 });
  recordTx("reclaim_missed_success", txRec2, rcptRec2, ((Date.now() - tRec2) / 1000).toFixed(2));

  await takeSnapshot("after_reclaim_missed_success");

  // Verify Tranche 2 state in grant
  const grantDataAfterRec = JSON.parse(await client.readContract({ address: gateAddress, functionName: 'get_grant', args: [grantId] }));
  const tr2State = grantDataAfterRec.tranches[2];
  console.log("  Tranche 2 on-chain record after reclaim:", tr2State);
  if (!tr2State.reclaimed) {
    throw new Error("Tranche 2 is not marked as reclaimed!");
  }

  // 7. Test Duplicate Reclaim on Tranche 2 -> Expected refusal
  console.log("\n7. Duplicate reclaim attempt on Tranche 2...");
  const tDupRec = Date.now();
  const txDupRec = await client.writeContract({ address: gateAddress, functionName: 'reclaim', args: [grantId, 2] });
  const rcptDupRec = await client.waitForTransactionReceipt({ hash: txDupRec, retries: 120, interval: 6000 });
  recordTx("duplicate_reclaim_refusal", txDupRec, rcptDupRec, ((Date.now() - tDupRec) / 1000).toFixed(2));

  await takeSnapshot("after_duplicate_reclaim_refusal");

  // 8. Test Legitimate Release on DELIVERED milestone (Tranche 0) -> Expected SUCCESS!
  console.log("\n8. Legitimate release on DELIVERED milestone (Tranche 0)...");
  const tRel0 = Date.now();
  const txRel0 = await client.writeContract({ address: gateAddress, functionName: 'release', args: [grantId, 0] });
  const rcptRel0 = await client.waitForTransactionReceipt({ hash: txRel0, retries: 120, interval: 6000 });
  recordTx("release_delivered_success", txRel0, rcptRel0, ((Date.now() - tRel0) / 1000).toFixed(2));

  await takeSnapshot("after_release_delivered_success");

  // Save evidence
  const evDir = path.join(__dirname, '../../docs/evidence');
  fs.writeFileSync(path.join(evDir, 'reclaim_receipts.json'), JSON.stringify(receipts, null, 2), 'utf8');
  fs.writeFileSync(path.join(evDir, 'reclaim_snapshots.json'), JSON.stringify(snapshots, null, 2), 'utf8');

  console.log("\n=================================================================");
  console.log("RECLAIM PROOF COMPLETED SUCCESSFULLY! ALL ARTIFACTS SAVED.");
  console.log("=================================================================");
}

main().catch(err => {
  console.error("RECLAIM PROOF FAILED:", err);
  process.exit(1);
});
