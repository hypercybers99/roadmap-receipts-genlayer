import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const v1 = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/source/deploy_tx_TrancheGate_v1.json'), 'utf8'));
const v2 = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/source/deploy_tx_TrancheGate_v2.json'), 'utf8'));

const code1 = Buffer.from(v1.data.contract_code, 'base64').toString('utf8');
const code2 = Buffer.from(v2.data.contract_code, 'base64').toString('utf8');

const sha1 = crypto.createHash('sha256').update(code1, 'utf8').digest('hex');
const sha2 = crypto.createHash('sha256').update(code2, 'utf8').digest('hex');

// Decode constructor argument from calldata
function extractAddress(calldataB64) {
  const buf = Buffer.from(calldataB64, 'base64');
  const match = buf.toString('latin1').match(/0x[a-fA-F0-9]{40}/);
  return match ? match[0] : 'unknown';
}

const arg1 = extractAddress(v1.data.calldata);
const arg2 = extractAddress(v2.data.calldata);

console.log('=== TrancheGate v1 vs v2 Parity Check ===');
console.log(`TrancheGate v1 Address: ${v1.contract_address || v1.data?.contract_address}`);
console.log(`TrancheGate v1 Source SHA-256: ${sha1}`);
console.log(`TrancheGate v1 Bound Ledger Address (Constructor Arg): ${arg1}`);
console.log(`TrancheGate v2 Address: ${v2.contract_address || v2.data?.contract_address}`);
console.log(`TrancheGate v2 Source SHA-256: ${sha2}`);
console.log(`TrancheGate v2 Bound Ledger Address (Constructor Arg): ${arg2}`);
console.log(`Exact Byte-for-Byte Code Parity: ${code1 === code2}`);
