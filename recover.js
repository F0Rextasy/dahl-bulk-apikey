'use strict';

/**
 * Finish (or recover) one already-signed-up account: sign in with the
 * fingerprint on a fresh exit, allocate the welcome grant to its key, verify.
 *
 * Usage: node recover.js --fingerprint=… [--username=…] [--key-id=…] [--token=…] [--amount=…]
 */

const fs = require('fs');
const path = require('path');
require('./guard').guard('recover');
const { OUT, proxyLib, arg } = require('./lib');
const { signInOn, finish } = require('./flow');

function exits() {
  const files = [path.join(OUT, 'dahl-point-of-use-live.txt'), path.join(OUT, 'dahl-screen-live.txt'), path.join(OUT, 'dahl-live.txt')];
  const seen = new Set();
  const out = [];
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const p of proxyLib.loadPoolFile(f)) {
      const k = `${p.protocol}://${p.host}:${p.port}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

(async () => {
  const fingerprint = arg('fingerprint');
  if (!fingerprint) throw new Error('--fingerprint required');
  const rec = {
    username: arg('username', null),
    fingerprint,
    keyId: arg('key-id') ? parseInt(arg('key-id'), 10) : null,
    keyToken: arg('token', null),
  };
  const amount = parseInt(arg('amount', '100000000'), 10);

  const list = exits();
  let lastErr;
  for (let i = 0; i < Math.min(list.length, 12); i++) {
    const exit = list[i];
    try {
      console.log(`[recover] exit ${proxyLib.label(exit)}`);
      const { d } = await signInOn(exit, fingerprint);
      console.log('[recover] signed in');
      const done = await finish(d, rec, { amount });
      fs.writeFileSync(path.join(OUT, 'recover-result.json'), JSON.stringify(done, null, 2));
      console.log('[recover] ok=%s balance=%s chat=%s', done.ok, JSON.stringify(done.balance), done.verify.chatStatus, JSON.stringify(done.verify.content));
      return;
    } catch (e) {
      lastErr = e;
      console.error(`[recover] ${proxyLib.label(exit)} failed: ${e.message}`);
      if (e.gate) break;
    }
  }
  throw lastErr || new Error('all exits failed');
})();
