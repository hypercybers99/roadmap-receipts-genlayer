const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');

const RPC_URL = "https://studio.genlayer.com/api";

function findTxHashes(obj, hashes = new Set()) {
  if (!obj) return hashes;
  if (typeof obj === 'string') {
    if (/^0x[a-fA-F0-9]{64}$/.test(obj)) {
      hashes.add(obj.toLowerCase());
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      findTxHashes(item, hashes);
    }
  } else if (typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      findTxHashes(val, hashes);
    }
  }
  return hashes;
}

async function queryReceipt(hash) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionByHash',
      params: [hash],
    }),
  });
  const data = await res.json();
  return data.result;
}

async function main() {
  console.log("=================================================================");
  console.log("ROADMAP RECEIPTS: CHECK FINALIZATION STATUS");
  console.log("=================================================================");

  const evidenceDir = path.join(__dirname, '../docs/evidence');
  const allHashes = new Set();

  // Search all json files in docs/evidence (excluding finalization/ folder)
  const entries = fs.readdirSync(evidenceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      const p = path.join(evidenceDir, entry.name);
      try {
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        findTxHashes(json, allHashes);
      } catch (e) {
        // ignore
      }
    }
  }

  // Also check scripts/deploy/deployments.json
  const depPath = path.join(__dirname, 'deploy/deployments.json');
  if (fs.existsSync(depPath)) {
    findTxHashes(JSON.parse(fs.readFileSync(depPath, 'utf8')), allHashes);
  }

  const hashList = Array.from(allHashes);
  console.log(`Discovered ${hashList.length} distinct transaction hashes across evidence.`);

  const statusCounts = {};
  const resultCounts = {};
  const receiptsMap = {};

  for (let i = 0; i < hashList.length; i++) {
    const hash = hashList[i];
    await new Promise(r => setTimeout(r, 150));
    try {
      const rcpt = await queryReceipt(hash);
      if (!rcpt) {
        statusCounts['NOT_FOUND'] = (statusCounts['NOT_FOUND'] || 0) + 1;
        receiptsMap[hash] = { status: 'NOT_FOUND' };
        continue;
      }
      const sName = rcpt.status || rcpt.status_name || 'UNKNOWN';
      const rName = rcpt.result_name || 'UNKNOWN';
      statusCounts[sName] = (statusCounts[sName] || 0) + 1;
      resultCounts[rName] = (resultCounts[rName] || 0) + 1;

      receiptsMap[hash] = {
        status: sName,
        result_name: rName,
        leader_result: rcpt.consensus_data?.leader_receipt?.[0]?.execution_result || null,
        recipient: rcpt.recipient || null,
      };
    } catch (err) {
      statusCounts['ERROR'] = (statusCounts['ERROR'] || 0) + 1;
      receiptsMap[hash] = { error: err.message };
    }
  }

  const nowIso = new Date().toISOString();
  const safeTimestamp = nowIso.replace(/:/g, '-').replace(/\..+/, 'Z');
  const finalDir = path.join(evidenceDir, 'finalization');
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }

  const outFile = path.join(finalDir, `${safeTimestamp}.json`);
  const record = {
    checked_at: nowIso,
    total_hashes_checked: hashList.length,
    status_counts: statusCounts,
    result_counts: resultCounts,
    receipts: receiptsMap,
  };
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));

  console.log(`\nFinalization record saved to: ${outFile}`);
  console.log("\nTransaction Counts by status_name:");
  for (const [s, c] of Object.entries(statusCounts)) {
    console.log(`  ${s.padEnd(20)}: ${c}`);
  }
  console.log("\nTransaction Counts by result_name:");
  for (const [r, c] of Object.entries(resultCounts)) {
    console.log(`  ${r.padEnd(20)}: ${c}`);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in check_finalization:", err);
  process.exit(1);
});
