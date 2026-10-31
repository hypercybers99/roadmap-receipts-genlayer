const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=================================================================");
  console.log("ROADMAP RECEIPTS: PRODUCTION SAMPLE TEST RUNNER (9 RUNS)");
  console.log("=================================================================");

  const account = createAccount();
  console.log("Production tester account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, 'deploy/deployments.json'), 'utf8'));
  const ledgerAddress = deployments.active_pair.RoadmapLedger.address;
  console.log("Active RoadmapLedger:", ledgerAddress);

  const fixtureSha = "c83e8f197f9264701f5362a8e2f13f5e185186e8";
  const rawPrefix = `https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/${fixtureSha}/lumen/`;

  const m1Criteria = [
    "A release note states that offline sync is available to all users.",
    "The release note names the version number that includes offline sync."
  ];
  const m2Criteria = [
    "The documentation lists endpoints for notes and for tags.",
    "A release note states that the API is generally available and not in beta."
  ];
  const m3Criteria = [
    "A published audit report is linked from the page."
  ];

  const milestonesTemplate = [
    {
      title: "M1: Offline sync",
      weight: 3,
      criteria: m1Criteria,
      evidence_url: `${rawPrefix}m1-delivered.md`,
    },
    {
      title: "M2: Public API",
      weight: 5,
      criteria: m2Criteria,
      evidence_url: `${rawPrefix}m2-partial.md`,
    },
    {
      title: "M3: Security audit",
      weight: 2,
      criteria: m3Criteria,
      evidence_url: `${rawPrefix}m3-missed.md`,
    },
  ];

  const sampleRuns = [];
  const targets = [
    { mIdx: 0, file: "m1-delivered.md", expectedStatus: "DELIVERED", expectedLabels: ["YES", "YES"] },
    { mIdx: 1, file: "m2-partial.md", expectedStatus: "PARTIAL", expectedLabels: ["YES", "NO"] },
    { mIdx: 2, file: "m3-missed.md", expectedStatus: "MISSED", expectedLabels: ["NO"] },
  ];

  // We run 3 iterations across 3 distinct test roadmaps
  for (let iter = 1; iter <= 3; iter++) {
    console.log(`\n--- Iteration ${iter}/3: Creating dedicated test roadmap ---`);
    await new Promise(r => setTimeout(r, 4000));
    const txRm = await client.writeContract({
      address: ledgerAddress,
      functionName: 'create_roadmap',
      args: [`Production Sample ${iter}`, JSON.stringify(milestonesTemplate)],
    });
    const rcptRm = await client.waitForTransactionReceipt({ hash: txRm, retries: 120, interval: 8000 });
    if (rcptRm.status_name !== 'ACCEPTED') {
      throw new Error(`create_roadmap failed with status ${rcptRm.status_name}`);
    }
    await new Promise(r => setTimeout(r, 2000));
    const statsRm = JSON.parse(await client.readContract({ address: ledgerAddress, functionName: 'get_stats', args: [] }));
    const rmId = parseInt(statsRm.total_roadmaps);
    console.log(`  Roadmap ${iter} created with ID: ${rmId}`);

    for (const t of targets) {
      console.log(`\nVerifying ${t.file} (run ${iter}/3 on Roadmap ${rmId}, M${t.mIdx})...`);
      await new Promise(r => setTimeout(r, 4000));
      const t0 = Date.now();
      const txV = await client.writeContract({
        address: ledgerAddress,
        functionName: 'verify',
        args: [rmId, t.mIdx],
      });
      const rcptV = await client.waitForTransactionReceipt({ hash: txV, retries: 120, interval: 8000 });
      const lat = ((Date.now() - t0) / 1000).toFixed(2);
      const lRes = rcptV.consensus_data?.leader_receipt?.[0]?.execution_result;
      await new Promise(r => setTimeout(r, 2000));
      const statsV = JSON.parse(await client.readContract({ address: ledgerAddress, functionName: 'get_stats', args: [] }));
      const vId = parseInt(statsV.total_verifications);

      // Read verification record
      await new Promise(r => setTimeout(r, 1000));
      const vRecRaw = await client.readContract({
        address: ledgerAddress,
        functionName: 'get_verification',
        args: [vId],
      });
      const vRec = JSON.parse(vRecRaw);

      const record = {
        target: t.file,
        run_index: iter,
        tx_hash: txV,
        latency_seconds: lat,
        status_name: rcptV.status_name,
        result_name: rcptV.result_name,
        leader_result: lRes,
        status: vRec.status,
        labels: vRec.labels,
        expected_status: t.expectedStatus,
        expected_labels: t.expectedLabels,
      };
      sampleRuns.push(record);
      console.log(`  [TX] ${txV} (${lat}s) -> status_name: ${rcptV.status_name}, leader: ${lRes}, status: ${vRec.status}, labels: ${JSON.stringify(vRec.labels)}`);

      // Progressive save
      const outPath = path.join(__dirname, '../docs/evidence/production_sample.json');
      fs.writeFileSync(outPath, JSON.stringify({ runs: sampleRuns }, null, 2));
    }
  }

  // Save to docs/evidence/production_sample.json
  const outPath = path.join(__dirname, '../docs/evidence/production_sample.json');
  fs.writeFileSync(outPath, JSON.stringify({ runs: sampleRuns }, null, 2));
  console.log(`\nSaved 9 production sample runs to ${outPath}`);

  // Print comparison table
  console.log("\n=================================================================");
  console.log("PRODUCTION SAMPLE VS PROBELABELS HARNESS COMPARISON TABLE");
  console.log("=================================================================");
  console.log("| Target Page | Run | Tx Hash | Latency | Status | Production Labels | ProbeLabels Labels | Match? |");
  console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |");
  for (const r of sampleRuns) {
    const pMatch = JSON.stringify(r.labels) === JSON.stringify(r.expected_labels);
    console.log(`| ${r.target} | ${r.run_index} | \`${r.tx_hash.slice(0, 10)}...\` | ${r.latency_seconds}s | \`${r.status}\` | \`${JSON.stringify(r.labels)}\` | \`${JSON.stringify(r.expected_labels)}\` | ${pMatch ? 'YES' : 'NO'} |`);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in run_production_sample:", err);
  process.exit(1);
});
