const fs = require('fs');
const path = require('path');

function reportFacts() {
  const root = path.join(__dirname, '..');
  const evidenceDir = path.join(root, 'docs', 'evidence');
  const deployPath = path.join(__dirname, 'deploy', 'deployments.json');
  const probePath = path.join(__dirname, 'deploy', 'probe_results.json');
  const corePath = path.join(__dirname, 'deploy', 'core_results.json');
  const receiptsPath = path.join(evidenceDir, 'onchain_receipts.json');
  const readbacksPath = path.join(evidenceDir, 'onchain_readbacks.json');
  const robustnessPath = path.join(evidenceDir, 'robustness_results.json');

  console.log("================================================================================");
  console.log("FACTS REPORT - ROADMAP RECEIPTS ON GENLAYER STUDIONET (PREVIEW)");
  console.log("================================================================================");

  if (fs.existsSync(deployPath)) {
    const deploys = JSON.parse(fs.readFileSync(deployPath, 'utf8'));
    console.log("\n[DEPLOYMENTS]");
    console.log("Network:       ", deploys.network);
    console.log("Chain ID:      ", deploys.chain_id);
    console.log("RPC URL:       ", deploys.rpc_url);
    console.log("Explorer Base: ", deploys.explorer_base);
    for (const [name, info] of Object.entries(deploys.contracts || {})) {
      console.log(`\nContract: ${name}`);
      console.log(`  Address:    ${info.address}`);
      console.log(`  Deploy Tx:  ${info.deploy_tx}`);
      console.log(`  Source SHA: ${info.source_sha256}`);
      console.log(`  Explorer:   ${info.explorer_url}`);
    }
  }

  if (fs.existsSync(probePath)) {
    const probe = JSON.parse(fs.readFileSync(probePath, 'utf8'));
    console.log("\n[MILESTONE 0 PROBE]");
    console.log("Probe Address:   ", probe.contractAddress);
    console.log("Deploy Latency:  ", probe.deployLatency + " s");
    console.log("Sender Observed: ", probe.views?.sender);
    console.log("Byte Stability:  ", probe.transactions?.find(t => t.action === 'probe_byte_stability')?.result?.stable ? "STABLE (5/5 identical hashes)" : "UNSTABLE");
    console.log("LLM Inference:   ", probe.transactions?.find(t => t.action === 'probe_llm_execution')?.latency_seconds + " s");
  }

  if (fs.existsSync(corePath)) {
    const core = JSON.parse(fs.readFileSync(corePath, 'utf8'));
    console.log("\n[MILESTONE 1 CORE]");
    console.log("Core Address:    ", core.contractAddress);
    console.log("Create Latency:  ", core.createLatency + " s");
    console.log("Milestones Hash: ", core.milestones_hash);
  }

  if (fs.existsSync(receiptsPath)) {
    const rcpts = JSON.parse(fs.readFileSync(receiptsPath, 'utf8'));
    console.log("\n[ON-CHAIN TRANSACTIONS - MILESTONE 4]");
    console.log(`Total Transactions Logged: ${rcpts.length}`);
    for (const r of rcpts) {
      console.log(`  - Action: ${r.action.padEnd(30)} | Latency: ${r.latency_seconds.padStart(5)}s | Status: ${r.status_name} | Leader: ${r.leader_result} | Tx: ${r.txHash}`);
    }
  }

  if (fs.existsSync(readbacksPath)) {
    const rbs = JSON.parse(fs.readFileSync(readbacksPath, 'utf8'));
    console.log("\n[READ-BACK VERIFICATIONS]");
    if (rbs.roadmap_1_scenario_1) {
      console.log("Roadmap 1 Scenario 1 Score:  progress_pct =", rbs.roadmap_1_scenario_1.progress_pct, "(Expected: 55)");
    }
    if (rbs.roadmap_1_scenario_2) {
      console.log("Roadmap 1 Scenario 2 Score:  progress_pct =", rbs.roadmap_1_scenario_2.progress_pct, "(Expected: 80)");
    }
    if (rbs.verification_6_tripwire) {
      console.log("Tripwire Gate Status:        status =", rbs.verification_6_tripwire.status, "| gate =", rbs.verification_6_tripwire.gate, "(Expected: REVIEW / TRIPWIRE)");
    }
    if (rbs.gate_stats) {
      console.log("TrancheGate Stats:           total_minted =", rbs.gate_stats.total_minted, "| total_escrow =", rbs.gate_stats.total_escrow);
      const sum = parseInt(rbs.gate_funder_balance || "0") + parseInt(rbs.gate_recipient_balance || "0") + parseInt(rbs.gate_stats.total_escrow || "0");
      console.log(`Conservation Invariant:      ${sum} == ${rbs.gate_stats.total_minted} -> ${sum === parseInt(rbs.gate_stats.total_minted) ? "VERIFIED PRESERVED" : "VIOLATED"}`);
    }
  }

  if (fs.existsSync(robustnessPath)) {
    const rob = JSON.parse(fs.readFileSync(robustnessPath, 'utf8'));
    console.log("\n[ROBUSTNESS EVALUATION (60 RUNS)]");
    console.log("Harness Address: ", rob.contractAddress);
    console.log("Total Runs:      ", rob.runs?.length);
  }

  console.log("================================================================================");
}

reportFacts();
