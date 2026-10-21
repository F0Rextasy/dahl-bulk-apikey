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
const { loadPool, request, pool, OUT, POOL_FILES, proxyLib, appendJsonl, arg, num, numArg } = require('./lib');

const HOST = 'https://inference.dahl.global';

async function main() {
  const start = num(process.argv[2]) ?? 0;
  const end = num(process.argv[3]) ?? start + 80;
  const url = arg('url', `${HOST}/docs/quickstart/`);
  const limit = numArg('limit', 0);
  const connectMs = numArg('connect', 6000);
  const conc = numArg('conc', 8);

  const filesArg = arg('files');
  const files = filesArg
    ? filesArg.split(',').map((f) => (path.isAbsolute(f) ? f : path.resolve(__dirname, '..', f)))
    : undefined;

  const all = loadPool(files);
  // No pool at all = DIRECT mode (documented, and `--screen` is how you probe
  // your own line). A pool file that exists and yields nothing is not the same
  // thing: `poolOrDirect` throws instead of probing the direct route as if the
  // exits you handed over did not exist.
  if (!all.length) all.push(...poolOrDirect(files || POOL_FILES, 'screen'));
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
    const row = { proxy: proxyLib.label(proxy), raw: proxy && proxy.raw, url };
    try {
      const res = await request(proxy, url, { timeoutMs: 30000, connectTimeoutMs: connectMs });
      row.status = res.status;
      row.ms = Date.now() - t;
      row.len = res.body.length;
      row.server = res.headers['server'];
      row.cf = res.headers['cf-ray'] ? 'cf' : '';
      if (res.status >= 200 && res.status < 500 && res.body.length > 200) {
        live++;
        // The live list is read back as a pool, so it needs the usable line: the
        // masked label would authenticate as the literal password `***`.
        if (proxy) fs.appendFileSync(liveFile, `${proxy.raw || proxyLib.label(proxy)}  # status=${res.status} ms=${row.ms}\n`);
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
