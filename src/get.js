'use strict';

/**
 * Fetch one URL through a (live) pool exit and print/write the body.
 *
 * Usage: node src/get.js <url> [--out=file] [--proxy=http://host:port] [--raw]
 * Picks exits from outputs/dahl-live.txt unless --proxy is given, retrying
 * until one carries the request.
 */

const fs = require('fs');
const path = require('path');
const { request, OUT, proxyLib, poolOrDirect, arg } = require('./lib');

function liveProxies() {
  const f = path.join(OUT, 'dahl-live.txt');
  if (!fs.existsSync(f)) return [];
  return proxyLib
    .loadPoolFile(f)
    .map((p) => ({ ...p, connectTimeoutMs: 8000, timeoutMs: 30000 }));
}

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('usage: node src/get.js <url>');
  const outFile = arg('out');
  const explicit = arg('proxy');
  const list = explicit ? [{ ...proxyLib.parseProxy(explicit), connectTimeoutMs: 8000, timeoutMs: 30000 }] : liveProxies();
  // No pool at all = fetch directly (the direct sentinel). An exit list that
  // exists and yields nothing is a broken list, not an empty one: throw.
  if (!list.length) list.push(...poolOrDirect([path.join(OUT, 'dahl-live.txt')], 'get'));

  let lastErr;
  for (let i = 0; i < Math.min(list.length, 25); i++) {
    const p = list[i % list.length];
    try {
      const res = await request(p, url, { timeoutMs: 30000, connectTimeoutMs: 8000 });
      const body = res.body;
      const meta = { url, status: res.status, exit: proxyLib.label(p), len: body.length, server: res.headers.server };
      if (outFile) {
        fs.writeFileSync(outFile, body);
        fs.writeFileSync(outFile + '.meta.json', JSON.stringify(meta, null, 2));
      }
      console.log(JSON.stringify(meta));
      if (!outFile) process.stdout.write(body.slice(0, 200000));
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  console.error('all exits failed:', lastErr && lastErr.message);
  process.exit(2);
})();
