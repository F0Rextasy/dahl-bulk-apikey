'use strict';

/**
 * Recover accounts that signed up but were not shipped (usually a `429
 * model_concurrency` at the verification chat, or a line that died before the
 * grant was allocated). Reads `outputs/pending-accounts.jsonl`, skips anything
 * already in `accounts.json`, then per record: sign in with the fingerprint on a
 * fresh exit → shortfall-only allocate → verify (with capacity retries) →
 * append to keys.txt / accounts.json.
 *
 * Usage: node src/finish-pending.js [--conc=3] [--limit=N]
 */

require('./guard').guard('finish-pending');
const fs = require('fs');
const path = require('path');
const { OUT, ROOT, proxyLib, pool, sleep, loadPool, arg } = require('./lib');
const { signInOn, finish } = require('./flow');

const CONC = parseInt(arg('conc', '3'), 10);
const LIMIT = parseInt(arg('limit', '0'), 10);
const AMOUNT = parseInt(arg('amount', '100000000'), 10);

const KEYS_FILE = path.join(ROOT, 'keys.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');
const PENDING = path.join(OUT, 'pending-accounts.jsonl');
const POINT_FILE = path.join(OUT, 'dahl-point-of-use-live.txt');

function exits() {
  const files = [POINT_FILE, path.join(OUT, 'dahl-screen-live.txt'), path.join(OUT, 'dahl-screen-live-mine.txt'), path.join(OUT, 'dahl-screen-live-w2.txt')];
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
  // Same last resort as mint.js: the raw pool file, unscreened.
  for (const p of loadPool()) {
    const k = `${p.protocol}://${p.host}:${p.port}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  if (!out.length) {
    // No pool = DIRECT mode: a proxy is recommended at scale (per-IP limits,
    // bans) but the tool works without one. `null` is the direct sentinel.
    console.log('[finish-pending] no proxy list — running WITHOUT a proxy (direct). Put exits in proxies.txt (or $DAHL_PROXIES) to route through them.');
    return [null];
  }

  return out;
}

function loadJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

(async () => {
  const accounts = fs.existsSync(ACCOUNTS_FILE) ? JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')) : [];
  const shipped = new Set(accounts.map((a) => a.username));
  const pending = loadJsonl(PENDING);
  const byUser = new Map();
  for (const p of pending) if (p.username && p.fingerprint) byUser.set(p.username, { ...(byUser.get(p.username) || {}), ...p });
  let todo = [...byUser.values()].filter((r) => !shipped.has(r.username));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log(`[finish-pending] pending accounts ${byUser.size}, to recover ${todo.length}`);

  const list = exits();
  console.log(`[finish-pending] exits ${list.filter(Boolean).length || 'direct'}`);
  let cursor = 0;
  const nextExit = () => list[cursor++ % list.length];
  let ok = 0;

  await pool(todo, CONC, async (rec) => {
    for (let attempt = 0; attempt < 8; attempt++) {
      const exit = nextExit();
      try {
        const { d } = await signInOn(exit, rec.fingerprint);
        const done = await finish(d, rec, { amount: AMOUNT });
        if (!done.ok) {
          console.error(`[finish-pending] ${rec.username} verify failed: ${JSON.stringify(done.verify).slice(0, 160)}`);
          return;
        }
        fs.appendFileSync(KEYS_FILE, done.keyToken + '\n');
        try {
          fs.appendFileSync(path.join(process.env.USERPROFILE || process.env.HOME || '.', 'dahl-keys.txt'), done.keyToken + '\n');
        } catch {}
        accounts.push(done);
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
        fs.appendFileSync(POINT_FILE, `${d.finishExit}\n`);
        ok++;
        console.log(`[finish-pending] recovered ${rec.username} key=${done.keyToken.slice(0, 9)}… bal=${done.balance.tokens} model=${done.verify.model}`);
        return;
      } catch (e) {
        console.error(`[finish-pending] ${rec.username} on ${proxyLib.label(exit)} → ${e.message}`);
        if (e.code === 429) await sleep(2000 + Math.random() * 3000);
        if (e.gate) return;
      }
    }
  });

  console.log(`[finish-pending] recovered ${ok}/${todo.length}; keys.txt now ${fs.readFileSync(KEYS_FILE, 'utf8').trim().split('\n').filter(Boolean).length} lines`);
})();
