'use strict';

/**
 * Screen: which pool exits can actually reach `inference.dahl.global:443`?
 *
 * One GET per candidate (`/docs/quickstart/`), 8 s connect + 30 s total, at most
 * 8 in flight. Survivors are appended to `outputs/dahl-live.txt` and the first
 * doc body of each distinct page shape is dumped to `outputs/`.
 *
 * Usage: node src/screen.js [start] [end] [--url=...] [--limit=N]
 */

const fs = require('fs');
const path = require('path');
const { loadPool, request, pool, OUT, proxyLib, appendJsonl, arg } = require('./lib');

const HOST = 'https://inference.dahl.global';

async function main() {
  const start = parseInt(process.argv[2] || '0', 10);
  const end = parseInt(process.argv[3] || String(start + 80), 10);
  const url = arg('url', `${HOST}/docs/quickstart/`);
  const limit = parseInt(arg('limit', '0'), 10);
  const connectMs = parseInt(arg('connect', '6000'), 10);
  const conc = parseInt(arg('conc', '8'), 10);

  const filesArg = arg('files');
  const files = filesArg
    ? filesArg.split(',').map((f) => (path.isAbsolute(f) ? f : path.resolve(__dirname, '..', f)))
    : undefined;

  const all = loadPool(files);
  if (!all.length) {
    // No pool = DIRECT mode: a proxy is recommended at scale (per-IP limits,
    // bans) but the tool works without one. `null` is the direct sentinel.
    console.log('[screen] no proxy list — probing the DIRECT route (no proxy).');
    all.push(null);
  }
  let slice = all.slice(start, end);
  if (limit) slice = slice.slice(0, limit);
  console.log(`[screen] candidates ${slice.length} (pool ${all.filter(Boolean).length || 'direct'}) → ${url}`);

  fs.mkdirSync(OUT, { recursive: true });
  const liveFile = arg('out') ? path.join(OUT, arg('out')) : path.join(OUT, 'dahl-live.txt');
  const logFile = path.join(OUT, arg('log', 'screen-log.jsonl'));

  let live = 0;
  const t0 = Date.now();
  const results = await pool(slice, conc, async (proxy, idx) => {
    const t = Date.now();
    const row = { proxy: proxyLib.label(proxy), url };
    try {
      const res = await request(proxy, url, { timeoutMs: 30000, connectTimeoutMs: connectMs });
      row.status = res.status;
      row.ms = Date.now() - t;
      row.len = res.body.length;
      row.server = res.headers['server'];
      row.cf = res.headers['cf-ray'] ? 'cf' : '';
      if (res.status >= 200 && res.status < 500 && res.body.length > 200) {
        live++;
        if (proxy) fs.appendFileSync(liveFile, `${proxyLib.label(proxy)}  # status=${res.status} ms=${row.ms}\n`);
        const bn = `doc-${path.basename(decodeURIComponent(new URL(url).pathname)) || 'root'}-${idx}.html`;
        const dump = path.join(OUT, bn);
        if (!fs.existsSync(dump)) fs.writeFileSync(dump, res.body.slice(0, 400000));
      }
    } catch (e) {
      row.error = e.message;
      row.ms = Date.now() - t;
    }
    appendJsonl(logFile, row);
    process.stdout.write(row.status ? `${row.status}` : '.');
    return row;
  });

  const statuses = {};
  for (const r of results) {
    const s = r.ok ? r.value.status || 'ERR' : 'ERR';
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log('');
  console.log(`[screen] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — live ${live}/${slice.length}`);
  console.log('[screen] statuses:', JSON.stringify(statuses));
}

main().catch((e) => {
  console.error('[screen] fatal', e);
  process.exit(1);
});
