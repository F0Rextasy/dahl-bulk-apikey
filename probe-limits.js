'use strict';

/**
 * Measure the operational limits the docs do not publish, on ONE funded account
 * (plus the anonymous /tokens path), through pool exits:
 *
 *   1. second key on a funded account      → does it get its own grant? (expect 0)
 *   2. allocate 1 token with an empty pool → which error/code (the pool gate)
 *   3. 5 concurrent chat completions       → 429 behaviour / observed burst limit
 *   4. GET /v1/models                      → live model ids (written to models.json)
 *   5. POST /tokens                        → anonymous key: same 100M allowance?
 *
 * Usage: node probe-limits.js --fingerprint=… --token=… [--models=…]
 */

const fs = require('fs');
const path = require('path');
const { OUT, ROOT, proxyLib, arg } = require('./lib');
const { Dahl } = require('./client');
const { signInOn } = require('./flow');

function exits() {
  const files = [path.join(OUT, 'dahl-point-of-use-live.txt'), path.join(OUT, 'dahl-screen-live.txt'), path.join(OUT, 'dahl-screen-live-mine.txt')];
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

async function onExit(fn, { tries = 10, label = 'op' } = {}) {
  const list = exits();
  let lastErr;
  for (let i = 0; i < Math.min(list.length, tries); i++) {
    try {
      return await fn(list[i]);
    } catch (e) {
      lastErr = e;
      console.error(`[limits] ${label} on ${proxyLib.label(list[i])} failed: ${e.message}`);
    }
  }
  throw lastErr || new Error('no exits');
}

(async () => {
  const fingerprint = arg('fingerprint');
  const token = arg('token');
  const model = arg('model', 'MiniMaxAI/MiniMax-M2.7');
  const sockets = parseInt(arg('sockets', '2'), 10);
  const only = arg('only');
  const burstN = parseInt(arg('burstN', '12'), 10);
  const burstC = parseInt(arg('burstC', '4'), 10);
  const outFile = only ? path.join(OUT, 'limits-' + only + '.json') : path.join(OUT, 'limits.json');
  const clientOpts = { maxSockets: sockets };
  const out = {};

  // 4. models (public, no auth)
  if (!only || only === 'models') out.models = await onExit(async (exit) => {
    const d = new Dahl(exit, clientOpts);
    const m = await d.models();
    if (m.status !== 200) throw new Error(`models ${m.status}`);
    fs.writeFileSync(path.join(ROOT, 'models.json'), JSON.stringify(m.data, null, 2));
    return { status: m.status, count: (m.data.data || []).length, ids: (m.data.data || []).map((x) => x.id), exit: d.label() };
  }, { label: 'models' });

  // 5. anonymous /tokens
  if (!only || only === 'tokens') out.anonToken = await onExit(async (exit) => {
    const d = new Dahl(exit);
    const t = await d.anonToken();
    const key = typeof t.data === 'object' && t.data ? t.data.token ?? t.data.api_key ?? t.data.key : t.data;
    let balance = null;
    if (typeof key === 'string' && key.startsWith('dahl_')) {
      const bal = await d.keyBalance(key);
      balance = bal.data;
    }
    return { status: t.status, shape: t.data && typeof t.data === 'object' ? Object.keys(t.data) : typeof t.data, keyPrefix: typeof key === 'string' ? key.slice(0, 12) + '…' : null, balance, exit: d.label() };
  }, { label: 'tokens' });

  if (fingerprint && (!only || only === 'account')) {
    out.account = await onExit(async (exit) => {
      const { d } = await signInOn(exit, fingerprint);
      const res = { exit: d.label() };

      // 1. second key
      const created = await d.createKey('probe2');
      const keyObj = (created.data && (created.data.key || created.data)) || {};
      res.secondKey = { status: created.status, id: keyObj.id, available: keyObj.available_tokens };
      if (keyObj.token) {
        const b = await d.keyBalance(keyObj.token);
        res.secondKey.balance = b.data;
      }

      // 2. allocate with an empty pool
      if (keyObj.id) {
        const al = await d.allocate(keyObj.id, 1);
        res.allocateWithEmptyPool = { status: al.status, data: al.data };
      }

      // account summary
      const acct = await d.getAccount();
      res.accountAfter = acct.data;
      return res;
    }, { label: 'account' });
  }

  // 3. burst on the funded key
  if (token && (!only || only === 'burst')) {
    out.burst = await onExit(async (exit) => {
      const d = new Dahl(exit, clientOpts);
      const t0 = Date.now();
      const results = [];
      const jobs = Array.from({ length: burstN }, (_, i) => i);
      let bc = 0;
      await Promise.all(
        Array.from({ length: burstC }, async () => {
          while (bc < jobs.length) {
            const i = bc++;
            results[i] = await d
              .chat(token, { model, messages: [{ role: 'user', content: `Reply with exactly: dahl-ok (${i})` }], max_tokens: 16 })
              .then((r) => ({ status: r.status, code: r.data && r.data.error && r.data.error.code }))
              .catch((e) => ({ error: e.message }));
          }
        })
      );
      let bal = null;
      try {
        bal = (await d.keyBalance(token)).data;
      } catch {}
      return { ms: Date.now() - t0, results, balanceAfter: bal, exit: d.label() };
    }, { label: 'burst' });
  }

  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 4000));
})();
