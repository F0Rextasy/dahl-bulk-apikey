'use strict';

/**
 * Dahl Inference batch mint: N accounts × 1 key, each with the welcome grant
 * allocated to its key and a live chat completion as the acceptance test.
 *
 * Exit discipline: one fresh pool exit per attempt; a dead exit fails the
 * attempt, never a fallback to our own line. Because `signup` is the expensive
 * step, its result is persisted to `outputs/pending-accounts.jsonl` before
 * anything else — a line dying right after signup costs an exit, not an
 * account: the fingerprint signs the account back in from a new exit.
 *
 * Artifacts: keys.txt (one verified key per line), accounts.json,
 * outputs/mint-log.jsonl, outputs/mint-state.json.
 *
 * Usage: node src/mint.js --count=30 [--conc=4] [--amount=100000000] [--model=<id>] [--exits=10] [--jiggle=0] [--preset=turbo|balanced|safe]
 */

const fs = require('fs');
const path = require('path');
require('./guard').guard('mint');
const { OUT, ROOT, POOL_FILES, proxyLib, pool, sleep, loadPool, poolOrDirect, arg, num, numArg, withUa } = require('./lib');
const { signupOn, finish, signInOn } = require('./flow');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node src/mint.js --count=30 [--conc=4] [--amount=100000000] [--model=<id>] [--exits=10] [--jiggle=0]');
  process.exit(0);
}
const { presetArgv, resolvePreset } = require('./preset');
const { uaFor } = require('./ua-pool');
const COUNT = numArg('count', 30);
// Presets (operator standard v3): turbo = 5 workers / 3 s pad, balanced = 4/6,
// safe = 2/8. Explicit --conc/--gap always win; without --preset the rail keeps
// today's shape exactly (4 workers, no extra pad).
const PRESET_RUN = resolvePreset({
  preset: (typeof arg('preset', null) === 'string' ? arg('preset', null) : null) || presetArgv(),
  conc: num(arg('conc', null)),
  gap: num(arg('gap', null)),
  defaultConc: 4,
  defaultGap: 0,
});
const CONC = Math.max(1, PRESET_RUN.conc);
const GAP_MS = Math.max(0, PRESET_RUN.gap) * 1000;
// Flag, then the documented environment variable (the launcher sets both), then
// the built-in default. A bare flag (`--amount`) means "the default", never NaN.
const AMOUNT = num(arg('amount', null)) ?? num(process.env.DAHL_AMOUNT) ?? 100000000;
const MODEL = (typeof arg('model', null) === 'string' ? arg('model', null) : null) || process.env.DAHL_MODEL || 'MiniMaxAI/MiniMax-M2.7';
const MAX_EXITS = Math.max(1, numArg('exits', 10));
const JIGGLE = numArg('jiggle', 0);

const KEYS_FILE = path.join(ROOT, 'keys.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');
const LOG_FILE = path.join(OUT, 'mint-log.jsonl');
const STATE_FILE = path.join(OUT, 'mint-state.json');
const POINT_FILE = path.join(OUT, 'dahl-point-of-use-live.txt');

const state = {
  startedAt: new Date().toISOString(),
  count: COUNT,
  amount: AMOUNT,
  model: MODEL,
  accounts: 0,
  keys: 0,
  exitsTried: 0,
  exitTransportFailures: 0,
  exitGrants: 0,
  signup429: 0,
  signinRecoveries: 0,
  errors: [],
  done: false,
};
const saveState = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
const logRow = (row) => fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: new Date().toISOString(), ...row }) + '\n');

function appendKey(key) {
  fs.appendFileSync(KEYS_FILE, key + '\n');
  try {
    fs.appendFileSync(path.join(process.env.USERPROFILE || process.env.HOME || '.', 'dahl-keys.txt'), key + '\n');
  } catch {}
}

/** The account ledger. A file that exists but does not parse is not "empty":
 *  it holds the fingerprints of the accounts already minted, so it is an error,
 *  not a reason to start over and overwrite it with this run's two accounts. */
const loadAccounts = () => {
  if (!fs.existsSync(ACCOUNTS_FILE)) return [];
  const text = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`${ACCOUNTS_FILE} is not valid JSON (${e.message}) — move it aside if you want a fresh file; every account's fingerprint lives here`);
  }
};
/** Temp file + rename: a crash mid-write must not leave a truncated ledger. */
const saveAccounts = (list) => {
  const tmp = ACCOUNTS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
  fs.renameSync(tmp, ACCOUNTS_FILE);
};

function exits() {
  const files = [
    POINT_FILE,
    path.join(OUT, 'dahl-screen-live.txt'),
    path.join(OUT, 'dahl-screen-live-mine.txt'),
    path.join(OUT, 'dahl-live.txt'),
  ];
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
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Last resort: the raw pool (`proxies.txt` / `$DAHL_PROXIES`). The signup is
  // itself the point-of-use probe, so an unscreened pool still mints — screening
  // only raises the yield per attempt.
  for (const p of loadPool()) {
    const k = `${p.protocol}://${p.host}:${p.port}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  // No pool at all = DIRECT mode (documented): a proxy is recommended at scale
  // (per-IP limits, bans) but the tool works without one. `null` is the direct
  // sentinel. A pool file that exists and yields nothing is a different thing —
  // `poolOrDirect` throws rather than sending every request from this machine.
  if (!out.length) return poolOrDirect(files.concat(POOL_FILES), 'mint');

  return out;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(KEYS_FILE)) fs.writeFileSync(KEYS_FILE, '');
  if (!fs.existsSync(ACCOUNTS_FILE)) saveAccounts([]);

  const list = exits();
  console.log(`[mint] count=${COUNT} conc=${CONC} gap=${GAP_MS / 1000}s${PRESET_RUN.name ? ` preset=${PRESET_RUN.name}` : ''} amount=${AMOUNT} model=${MODEL} exits=${list.filter(Boolean).length || 'direct'}`);
  if (!list.length) throw new Error('exit queue empty');
  let cursor = 0;
  const nextExit = () => list[cursor++ % list.length];

  const accounts = loadAccounts();
  const seenUsers = new Set(accounts.map((a) => a.username));
  let done = 0;
  const t0 = Date.now();
  saveState();
  const heartbeat = setInterval(() => {
    state.seconds = Math.round((Date.now() - t0) / 1000);
    saveState();
  }, 20000);

  await pool(
    Array.from({ length: COUNT }, (_, i) => i),
    CONC,
    // Per-account fingerprint: the item body runs inside withUa so every request
    // of this account carries its own UA from the ua-pool.
    async (idx) => withUa(uaFor(idx + 1).ua, async () => {
      if (JIGGLE) await sleep(Math.random() * JIGGLE);
      if (GAP_MS) await sleep(GAP_MS);
      let rec = null;
      let client = null;
      let transportAttempts = 0;

      for (let attempt = 0; attempt < MAX_EXITS * 3 && transportAttempts < MAX_EXITS; attempt++) {
        const exit = nextExit();
        state.exitsTried++;
        if (!attempt) console.log(`… #${idx + 1} başladı (${String(proxyLib.label(exit)).replace(/:[^:@]+@/, ':***@')})`);
        try {
          if (!rec) {
            // Phase 1: create the account.
            const res = await signupOn(exit);
            rec = res.rec;
            client = res.d;
          } else {
            // Phase 2 after a lost line: sign back in with the fingerprint.
            const res = await signInOn(exit, rec.fingerprint);
            client = res.d;
            state.signinRecoveries++;
          }
          const doneRec = await finish(client, rec, { amount: AMOUNT, model: MODEL });
          rec = doneRec;
          if (!rec.ok) {
            logRow({ idx, stage: 'verify-failed', ...rec });
            state.errors.push({ idx, username: rec.username, note: 'verification failed', verify: rec.verify });
            // Key cannot actually call a model → do not ship it.
            saveState();
            return;
          }
          state.exitGrants++;
          state.accounts++;
          state.keys++;
          appendKey(rec.keyToken);
          accounts.push(rec);
          saveAccounts(accounts);
          seenUsers.add(rec.username);
          logRow({ idx, stage: 'minted', ...rec });
          fs.appendFileSync(POINT_FILE, `${rec.signupExitRaw || rec.signupExit}\n${rec.exit || ''}\n`.replace(/\n\n/g, '\n'));
          done++;
          console.log(
            `[mint] ${done}/${COUNT} ${rec.username} key=${rec.keyToken.slice(0, 9)}…${rec.keyToken.slice(-4)} pool=${rec.allocate.poolBefore} alloc=${rec.allocate.requested} bal=${rec.balance.tokens} chat=${rec.verify.chatStatus} exit=${rec.signupExit}`
          );
          console.log(`✓ #${idx + 1} KEY ALINDI: ${rec.keyToken.slice(0, 22)}… [${state.keys} ok / ${COUNT} deneme]`);
          saveState();
          return;
        } catch (e) {
          const isRate = e.code === 429;
          if (isRate) {
            state.signup429++;
            await sleep(1500 + Math.random() * 2000);
          } else {
            state.exitTransportFailures++;
            transportAttempts++;
          }
          logRow({ idx, stage: rec ? 'finish-failed' : 'signup-failed', exit: proxyLib.label(exit), error: e.message, code: e.code || null, gate: !!e.gate, transportAttempts });
          console.error(`✗ #${idx + 1} key yok: ${String(e.message || e).slice(0, 160)}`);
          if (e.gate) {
            state.errors.push({ idx, username: rec && rec.username, exit: proxyLib.label(exit), error: e.message, gate: true });
            saveState();
            return;
          }
          // Transport failure (or a rate window) → next exit, keeping the account record.
        } finally {
          // The attempt is over: the client is what holds the tunnel open, and a
          // run makes one per account (one per attempt when lines keep dying).
          if (client) client.destroy();
          client = null;
        }
      }
      state.errors.push({ idx, username: rec && rec.username, note: 'exhausted exits' });
      console.error(`✗ #${idx + 1} key yok: exhausted exits`);
      saveState();
    })
  );

  state.done = true;
  state.finishedAt = new Date().toISOString();
  state.seconds = Math.round((Date.now() - t0) / 1000);
  clearInterval(heartbeat);
  saveState();
  console.log(
    `[mint] done: ${state.keys}/${COUNT} keys; exits tried ${state.exitsTried}, transport failures ${state.exitTransportFailures}, 429s ${state.signup429}, signin recoveries ${state.signinRecoveries}, ${state.seconds}s`
  );
  console.log(state.keys >= COUNT ? `DAHL-MINT ${state.keys}/${COUNT} OK` : `DAHL-MINT ${state.keys}/${COUNT} — short of the target (each failed account is in outputs/)`);
  if (state.keys < COUNT) process.exitCode = 1;
}

main().catch((e) => {
  console.error('[mint] fatal', e);
  process.exit(1);
});
