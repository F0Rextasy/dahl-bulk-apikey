'use strict';

/**
 * Build the report's masked key table from accounts.json + verify-report.json.
 * Masks as `first4…last4` of the token body.
 *
 * Usage: node src/make-keys-table.js   → writes outputs/keys-table.md
 */

const fs = require('fs');
const path = require('path');
const { ROOT, OUT } = require('./lib');

const acc = JSON.parse(fs.readFileSync(path.join(ROOT, 'accounts.json'), 'utf8'));
const rep = fs.existsSync(path.join(OUT, 'verify-report.json'))
  ? JSON.parse(fs.readFileSync(path.join(OUT, 'verify-report.json'), 'utf8'))
  : [];

const mask4 = (k) => `dahl_${k.slice(5, 9)}…${k.slice(-4)}`;
const byMask = new Map(rep.map((r) => [r.key, r]));

let live = 0;
const lines = ['| # | key (`first4…last4`) | account | balance now | answered by | verify |', '|---|---|---|---|---|---|'];
acc.forEach((a, i) => {
  const r = byMask.get(mask4(a.keyToken)) || byMask.get(`dahl_${a.keyToken.slice(5, 8)}…${a.keyToken.slice(-4)}`);
  const balance = r ? r.balance : a.balance && a.balance.tokens;
  const model = (r && r.model) || (a.verify && a.verify.model) || '';
  const ok = r ? r.ok : a.ok;
  if (ok) live++;
  lines.push(`| ${i + 1} | \`${mask4(a.keyToken)}\` | ${a.username} | ${balance} | ${model} | ${ok ? '200 live' : 'failed'} |`);
});

const table = lines.join('\n');
fs.writeFileSync(path.join(OUT, 'keys-table.md'), table + '\n');
console.log(table);
console.log(`\n[live ${live}/${acc.length}]`);
