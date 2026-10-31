const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=================================================================");
  console.log("TESTING 404 AND TOO-SHORT ERROR PATHS ON V2 (3 RUNS EACH)");
  console.log("=================================================================");

  const account = createAccount();
  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployments.json'), 'utf8'));
  const ledgerAddress = deployments.active_pair.RoadmapLedger.address;
  console.log("Testing on active RoadmapLedger:", ledgerAddress);

  const fixtureSha = "c83e8f197f9264701f5362a8e2f13f5e185186e8";
  const rawPrefix = `https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/${fixtureSha}/lumen/`;

  const ms = [
    {
      title: "404 Test 1",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}nonexistent_run_1.md`
    },
    {
      title: "404 Test 2",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}nonexistent_run_2.md`
    },
    {
      title: "404 Test 3",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}nonexistent_run_3.md`
    },
    {
      title: "Too Short Test 1",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}m3-too-short.md`
    },
    {
      title: "Too Short Test 2",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}m3-too-short.md`
    },
    {
      title: "Too Short Test 3",
      criteria: ["Criterion placeholder text for length."],
      weight: 1,
      evidence_url: `${rawPrefix}m3-too-short.md`
    }
  ];

  console.log("\nCreating dedicated 6-milestone error testing roadmap...");
  const txCreate = await client.writeContract({
    address: ledgerAddress,
    functionName: 'create_roadmap',
    args: ["Error Testing Roadmap", JSON.stringify(ms)],
  });
  const rcptCreate = await client.waitForTransactionReceipt({ hash: txCreate, retries: 120, interval: 4000 });
  const statsRaw = await client.readContract({ address: ledgerAddress, functionName: 'get_stats', args: [] });
  const rmId = parseInt(JSON.parse(statsRaw).total_roadmaps);
  console.log(`  Roadmap created with ID: ${rmId} (${rcptCreate.status_name} ${rcptCreate.result_name})`);

  const runs404 = [];
  const runsTooShort = [];

  // Run 3 times on 404 URL (Milestones 0, 1, 2)
  console.log("\n--- Executing 3 consecutive 404 URL verify runs ---");
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const tx = await client.writeContract({
      address: ledgerAddress,
      functionName: 'verify',
      args: [rmId, i],
    });
    const rcpt = await client.waitForTransactionReceipt({ hash: tx, retries: 120, interval: 4000 });
    const lat = ((Date.now() - t0) / 1000).toFixed(2);
    const lr = rcpt.consensus_data?.leader_receipt?.[0];
    const payload = lr?.result?.payload;
    runs404.push({
      run: i + 1,
      txHash: tx,
      latency: lat,
      status_name: rcpt.status_name,
      result_name: rcpt.result_name,
      leader_result: lr?.execution_result,
      payload: payload,
    });
    console.log(`  Run ${i + 1}: status=${rcpt.status_name}, result=${rcpt.result_name}, leader=${lr?.execution_result}, payload="${payload}", lat=${lat}s, tx=${tx}`);
  }

  // Run 3 times on Too Short URL (Milestones 3, 4, 5)
  console.log("\n--- Executing 3 consecutive Too-Short verify runs ---");
  for (let i = 3; i < 6; i++) {
    const t0 = Date.now();
    const tx = await client.writeContract({
      address: ledgerAddress,
      functionName: 'verify',
      args: [rmId, i],
    });
    const rcpt = await client.waitForTransactionReceipt({ hash: tx, retries: 120, interval: 4000 });
    const lat = ((Date.now() - t0) / 1000).toFixed(2);
    const lr = rcpt.consensus_data?.leader_receipt?.[0];
    const payload = lr?.result?.payload;
    runsTooShort.push({
      run: i - 2,
      txHash: tx,
      latency: lat,
      status_name: rcpt.status_name,
      result_name: rcpt.result_name,
      leader_result: lr?.execution_result,
      payload: payload,
    });
    console.log(`  Run ${i - 2}: status=${rcpt.status_name}, result=${rcpt.result_name}, leader=${lr?.execution_result}, payload="${payload}", lat=${lat}s, tx=${tx}`);
  }

  const outPath = path.join(__dirname, '../../docs/evidence/error_cases_v2_runs.json');
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    ledger_address: ledgerAddress,
    roadmap_id: rmId,
    runs_404: runs404,
    runs_too_short: runsTooShort,
  }, null, 2));

  console.log(`\nSuccessfully recorded all 6 error case runs to: ${outPath}`);
}

main().catch((err) => {
  console.error("ERROR IN TEST:", err);
  process.exit(1);
});
