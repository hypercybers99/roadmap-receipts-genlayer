const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("=================================================");
  console.log("ROADMAP RECEIPTS: ROBUSTNESS HARNESS (60 RUNS)");
  console.log("=================================================");

  const account = createAccount();
  console.log("Generated throwaway account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const probeLabelsPath = path.join(__dirname, '../contracts/ProbeLabels.py');
  const code = fs.readFileSync(probeLabelsPath, 'utf8');
  const codeSha = crypto.createHash('sha256').update(code, 'utf8').digest('hex');
  console.log("ProbeLabels source sha256:", codeSha);

  console.log("\n1. Deploying ProbeLabels contract to Studionet...");
  const t0 = Date.now();
  const deployTxHash = await client.deployContract({
    code: code,
    args: [],
  });
  console.log("Deploy tx submitted. Hash:", deployTxHash);

  const deployReceipt = await client.waitForTransactionReceipt({
    hash: deployTxHash,
    retries: 120,
    interval: 3000,
  });
  const deployLatency = ((Date.now() - t0) / 1000).toFixed(2);
  const leaderRes = deployReceipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  const contractAddress = deployReceipt.recipient;
  console.log(`ProbeLabels deployed at ${contractAddress} in ${deployLatency}s (leader: ${leaderRes})`);

  if (!contractAddress || leaderRes !== 'SUCCESS') {
    throw new Error("ProbeLabels deployment failed: " + JSON.stringify(deployReceipt));
  }

  const fixtureSha = "c83e8f197f9264701f5362a8e2f13f5e185186e8";
  const basePrefix = `https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/${fixtureSha}/lumen/`;

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

  const targets = [
    { file: "m1-delivered.md", criteria: m1Criteria, expectedStatus: "DELIVERED" },
    { file: "m1-delivered.html", criteria: m1Criteria, expectedStatus: "DELIVERED" },
    { file: "m1-missed.md", criteria: m1Criteria, expectedStatus: "MISSED" },
    { file: "m2-partial.md", criteria: m2Criteria, expectedStatus: "PARTIAL" },
    { file: "m2-delivered.md", criteria: m2Criteria, expectedStatus: "DELIVERED" },
    { file: "m3-missed.md", criteria: m3Criteria, expectedStatus: "MISSED" },
  ];

  const results = {
    contractAddress,
    deployTxHash,
    deployLatency,
    fixtureCommitSha: fixtureSha,
    summary: {},
    runs: [],
  };

  console.log("\n2. Executing 10 repeated evaluation runs per fixture page (60 runs total)...");

  for (const t of targets) {
    const url = basePrefix + t.file;
    const critJson = JSON.stringify(t.criteria);
    console.log(`\n--- Target: ${t.file} (Expected: ${t.expectedStatus}) ---`);

    for (let i = 1; i <= 10; i++) {
      const resKey = `${t.file}_run_${i}`;
      const tStart = Date.now();
      try {
        const txHash = await client.writeContract({
          address: contractAddress,
          functionName: 'evaluate_page',
          args: [url, critJson, resKey],
        });
        const rcpt = await client.waitForTransactionReceipt({
          hash: txHash,
          retries: 120,
          interval: 3000,
        });
        const lat = ((Date.now() - tStart) / 1000).toFixed(2);
        const lRes = rcpt.consensus_data?.leader_receipt?.[0]?.execution_result;
        
        const rawOutput = await client.readContract({
          address: contractAddress,
          functionName: 'get_result',
          args: [resKey],
        });

        console.log(`  Run ${i}/10: ${lat}s, status: ${rcpt.status_name}, leader: ${lRes}`);

        results.runs.push({
          target: t.file,
          expectedStatus: t.expectedStatus,
          criteria: t.criteria,
          runIndex: i,
          txHash,
          latency: lat,
          status_name: rcpt.status_name,
          leader_result: lRes,
          rawOutput,
        });
      } catch (err) {
        console.error(`  Run ${i}/10 ERROR:`, err.message);
        results.runs.push({
          target: t.file,
          expectedStatus: t.expectedStatus,
          criteria: t.criteria,
          runIndex: i,
          error: err.message,
        });
      }
    }
  }

  const outDir = path.join(__dirname, '../docs/evidence');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'robustness_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("\nRobustness runs completed! Saved to:", outPath);
}

main().catch((err) => {
  console.error("FATAL ERROR in run_robustness:", err);
  process.exit(1);
});
