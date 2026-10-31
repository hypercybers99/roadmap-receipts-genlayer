const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("=================================================================");
  console.log("ROADMAP RECEIPTS: DEPLOYING ACTIVE CONTRACT PAIR (V2)");
  console.log("=================================================================");

  const account = createAccount();
  console.log("Deployer throwaway account:", account.address);

  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const ledgerPath = path.join(__dirname, '../../contracts/RoadmapLedger.py');
  const gatePath = path.join(__dirname, '../../contracts/TrancheGate.py');

  let ledgerCode = fs.readFileSync(ledgerPath, 'utf8').replace(/\r\n/g, '\n');
  let gateCode = fs.readFileSync(gatePath, 'utf8').replace(/\r\n/g, '\n');

  const ledgerSha = crypto.createHash('sha256').update(ledgerCode, 'utf8').digest('hex');
  const gateSha = crypto.createHash('sha256').update(gateCode, 'utf8').digest('hex');

  console.log("RoadmapLedger source sha256:", ledgerSha);
  console.log("TrancheGate source sha256:  ", gateSha);

  // 1. Deploy RoadmapLedger v2
  console.log("\n1. Deploying RoadmapLedger (v2)...");
  const tL0 = Date.now();
  const txLedger = await client.deployContract({
    code: ledgerCode,
    args: [],
  });
  console.log("  Deploy tx submitted:", txLedger);

  const rcptLedger = await client.waitForTransactionReceipt({
    hash: txLedger,
    retries: 120,
    interval: 5000,
  });
  const latLedger = ((Date.now() - tL0) / 1000).toFixed(2);
  const ledgerAddr = rcptLedger.recipient;
  const lLeaderRes = rcptLedger.consensus_data?.leader_receipt?.[0]?.execution_result;

  console.log(`  RoadmapLedger deployed in ${latLedger}s at: ${ledgerAddr}`);
  console.log(`  Status: ${rcptLedger.status_name}, Result: ${rcptLedger.result_name}, Leader: ${lLeaderRes}`);

  if (!ledgerAddr || lLeaderRes !== 'SUCCESS') {
    throw new Error("RoadmapLedger deployment failed: " + JSON.stringify(rcptLedger));
  }

  // 2. Deploy TrancheGate v2 (bound to new RoadmapLedger address)
  console.log(`\n2. Deploying TrancheGate (v2) bound to ${ledgerAddr}...`);
  const tG0 = Date.now();
  const txGate = await client.deployContract({
    code: gateCode,
    args: [ledgerAddr],
  });
  console.log("  Deploy tx submitted:", txGate);

  const rcptGate = await client.waitForTransactionReceipt({
    hash: txGate,
    retries: 120,
    interval: 5000,
  });
  const latGate = ((Date.now() - tG0) / 1000).toFixed(2);
  const gateAddr = rcptGate.recipient;
  const gLeaderRes = rcptGate.consensus_data?.leader_receipt?.[0]?.execution_result;

  console.log(`  TrancheGate deployed in ${latGate}s at: ${gateAddr}`);
  console.log(`  Status: ${rcptGate.status_name}, Result: ${rcptGate.result_name}, Leader: ${gLeaderRes}`);

  if (!gateAddr || gLeaderRes !== 'SUCCESS') {
    throw new Error("TrancheGate deployment failed: " + JSON.stringify(rcptGate));
  }

  // Update deployments.json
  const deployMeta = {
    network: "GenLayer Studionet",
    chain_id: 61999,
    rpc_url: "https://studio.genlayer.com/api",
    explorer_base: "https://explorer-studio.genlayer.com/address/",
    active_pair: {
      RoadmapLedger: {
        address: ledgerAddr,
        deploy_tx: txLedger,
        deploy_latency_seconds: latLedger,
        source_sha256: ledgerSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${ledgerAddr}`
      },
      TrancheGate: {
        address: gateAddr,
        deploy_tx: txGate,
        deploy_latency_seconds: latGate,
        source_sha256: gateSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${gateAddr}`
      }
    },
    contracts: {
      RoadmapLedger: {
        address: ledgerAddr,
        deploy_tx: txLedger,
        source_sha256: ledgerSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${ledgerAddr}`
      },
      TrancheGate: {
        address: gateAddr,
        deploy_tx: txGate,
        source_sha256: gateSha,
        explorer_url: `https://explorer-studio.genlayer.com/address/${gateAddr}`
      }
    },
    superseded_pair: {
      RoadmapLedger: {
        address: "0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D",
        deploy_tx: "0x6b58d6a56bc212bac0541ef857028fde452a15d7074acc113843ad974376ddc6",
        source_sha256: "82c68250dbf7e488ca0fd89dec6f3df23e25d8a1c1d4930b48c7f2c63cb4fd5d",
        explorer_url: "https://explorer-studio.genlayer.com/address/0xD22E8C03EbB382D9A9df07829e18c2E4DDd6f67D"
      },
      TrancheGate: {
        address: "0x437c45bD60e202Cc7C08C7C4A94e603649750fA8",
        deploy_tx: "0xc8ed01b1e5ab8cae8fa26cc2ee0786c8d147824f94b65bb3939d34400a708347",
        source_sha256: "8377fc0141693eabcde991126a044ad225cde560adc683490e7199613f2a5548",
        explorer_url: "https://explorer-studio.genlayer.com/address/0x437c45bD60e202Cc7C08C7C4A94e603649750fA8"
      }
    }
  };

  const deployOutPath = path.join(__dirname, 'deployments.json');
  fs.writeFileSync(deployOutPath, JSON.stringify(deployMeta, null, 2), 'utf8');
  console.log("\nSaved updated deployment metadata to:", deployOutPath);

  // Save raw deploy payloads and extracted sources
  const srcDir = path.join(__dirname, '../../docs/evidence/source');
  if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

  async function saveDeployArtifacts(name, txHash, codeContent) {
    const res = await fetch("https://studio.genlayer.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] })
    });
    const data = await res.json();
    fs.writeFileSync(path.join(srcDir, `deploy_tx_${name}_v2.json`), JSON.stringify(data.result, null, 2), 'utf8');

    const b64 = data.result?.data?.contract_code;
    const decoded = Buffer.from(b64, 'base64').toString('utf8');
    fs.writeFileSync(path.join(srcDir, `${name}_v2_onchain.py`), decoded, 'utf8');
    const sha = crypto.createHash('sha256').update(decoded, 'utf8').digest('hex');
    console.log(`Extracted on-chain source for ${name} v2: SHA256 = ${sha}`);
  }

  await saveDeployArtifacts('RoadmapLedger', txLedger, ledgerCode);
  await saveDeployArtifacts('TrancheGate', txGate, gateCode);

  console.log("\nV2 Deployment Complete!");
}

main().catch(err => {
  console.error("DEPLOYMENT FAILED:", err);
  process.exit(1);
});
