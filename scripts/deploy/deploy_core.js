const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("=================================================");
  console.log("ROADMAP RECEIPTS: MILESTONE 1 MINIMAL CORE");
  console.log("=================================================");

  const account = createAccount();
  console.log("Generated throwaway account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const corePath = path.join(__dirname, '../../contracts/CoreRoadmapLedger.py');
  const code = fs.readFileSync(corePath, 'utf8');
  const codeSha = crypto.createHash('sha256').update(code, 'utf8').digest('hex');
  console.log("Core source sha256:", codeSha);

  console.log("\n1. Deploying CoreRoadmapLedger contract to Studionet (Chain 61999)...");
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
  console.log(`Deploy receipt received in ${deployLatency}s:`);
  console.log("  status_name:", deployReceipt.status_name);
  console.log("  result_name:", deployReceipt.result_name);
  const leaderRes = deployReceipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log("  leader execution_result:", leaderRes);

  const contractAddress = deployReceipt.recipient;
  console.log("Core contract deployed address:", contractAddress);

  if (!contractAddress || leaderRes !== 'SUCCESS') {
    throw new Error("Core contract deployment failed: " + JSON.stringify(deployReceipt));
  }

  // 2. Prepare test roadmap JSON matching Lumen Notes specifications
  const rawBase = "https://raw.githubusercontent.com/hypercybers99/roadmap-receipts-fixtures/c83e8f197f9264701f5362a8e2f13f5e185186e8/lumen/";
  const testMilestones = [
    {
      title: "Offline sync",
      criteria: [
        "A release note states that offline sync is available to all users.",
        "The release note names the version number that includes offline sync."
      ],
      weight: 3,
      evidence_url: `${rawBase}m1-delivered.md`
    },
    {
      title: "Public API",
      criteria: [
        "The documentation lists endpoints for notes and for tags.",
        "A release note states that the API is generally available and not in beta."
      ],
      weight: 5,
      evidence_url: `${rawBase}m2-partial.md`
    },
    {
      title: "Security audit published",
      criteria: [
        "A published audit report is linked from the page."
      ],
      weight: 2,
      evidence_url: `${rawBase}m3-missed.md`
    }
  ];

  console.log("\n2. Calling create_roadmap with 3 milestones...");
  const tCreate = Date.now();
  const createTxHash = await client.writeContract({
    address: contractAddress,
    functionName: 'create_roadmap',
    args: ["Lumen Notes Roadmap", JSON.stringify(testMilestones)],
  });
  console.log("  createTxHash submitted:", createTxHash);

  const createReceipt = await client.waitForTransactionReceipt({
    hash: createTxHash,
    retries: 120,
    interval: 3000,
  });
  const createLatency = ((Date.now() - tCreate) / 1000).toFixed(2);
  const createLeadRes = createReceipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log(`  create_roadmap receipt received in ${createLatency}s:`);
  console.log("    status_name:", createReceipt.status_name);
  console.log("    result_name:", createReceipt.result_name);
  console.log("    leader execution_result:", createLeadRes);

  if (createLeadRes !== 'SUCCESS') {
    throw new Error("create_roadmap failed: " + JSON.stringify(createReceipt));
  }

  // 3. Read back roadmap state
  console.log("\n3. Reading back roadmap state for id '1'...");
  const roadmapJson = await client.readContract({
    address: contractAddress,
    functionName: 'get_roadmap',
    args: ["1"],
  });
  console.log("  Read-back roadmap JSON:", roadmapJson);
  const roadmap = JSON.parse(roadmapJson);

  if (roadmap.id !== "1") throw new Error("Expected roadmap id '1', got: " + roadmap.id);
  if (roadmap.name !== "Lumen Notes Roadmap") throw new Error("Expected name 'Lumen Notes Roadmap', got: " + roadmap.name);
  if (roadmap.owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`Owner mismatch: expected ${account.address}, got ${roadmap.owner}`);
  }
  if (!roadmap.milestones_hash || roadmap.milestones_hash.length !== 64) {
    throw new Error("Invalid milestones_hash: " + roadmap.milestones_hash);
  }
  if (roadmap.milestones.length !== 3) {
    throw new Error("Expected 3 milestones, got: " + roadmap.milestones.length);
  }
  if (roadmap.progress_pct !== "0") {
    throw new Error("Expected progress_pct '0', got: " + roadmap.progress_pct);
  }

  console.log("  milestones_hash:", roadmap.milestones_hash);
  console.log("  all assertions passed!");

  const results = {
    contractAddress,
    deployTxHash,
    deployLatency,
    codeSha256: codeSha,
    sender: account.address,
    createTxHash,
    createLatency,
    milestones_hash: roadmap.milestones_hash,
    readBackRoadmap: roadmap,
  };

  const outPath = path.join(__dirname, 'core_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log("\nMilestone 1 Minimal Core Complete! Results saved to:", outPath);
}

main().catch((err) => {
  console.error("FATAL ERROR in deploy_core:", err);
  process.exit(1);
});
