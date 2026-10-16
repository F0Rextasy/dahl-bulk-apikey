'use strict';

/**
 * Turn a screen log into a live-exit list: every row with an HTTP 200 (any
 * body size — `/health` is 15 bytes, so body length is not a liveness signal).
 *
 * Usage: node src/live-from-log.js <log.jsonl> <out.txt>
 */

const fs = require('fs');

const [logFile, outFile] = process.argv.slice(2);
if (!logFile || !outFile) throw new Error('usage: node src/live-from-log.js <log.jsonl> <out.txt>');

const seen = new Set();
const live = [];
const src = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
for (const line of src.split('\n')) {
  const t = line.trim();
  if (!t) continue;
  let row;
  try {
    row = JSON.parse(t);
  } catch {
    continue;
  }
  if (row.status !== 200 || !row.proxy) continue;
  if (seen.has(row.proxy)) continue;
  seen.add(row.proxy);
  live.push(`${row.proxy}  # ms=${row.ms} ${row.ts || ''}`);
}
fs.writeFileSync(outFile, live.join('\n') + (live.length ? '\n' : ''));
console.log(`[live-from-log] ${live.length} live exits → ${outFile}`);
