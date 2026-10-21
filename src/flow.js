'use strict';

/**
 * Dahl account flow — split so a dead exit never loses an account.
 *
 * Phase 1 (signup)    : one exit: health → check-username → POST /v1/auth/signup
 *                       → the whole response is persisted BEFORE anything else.
 * Phase 2 (finish)    : same exit if alive, otherwise a fresh exit signs in with
 *                       the fingerprint (`POST /v1/auth/signin {fingerprint}`),
 *                       then allocate pool → key, read the balance, and run a
 *                       real chat completion as the acceptance test.
 *
 * `POST /v1/auth/signup` returns `{user, fingerprint, api_key:{id, token}}` with
 * the first key at 0 tokens; the 100M welcome grant sits in the account pool.
 */

const fs = require('fs');
const path = require('path');
const { OUT, sleep } = require('./lib');
const { Dahl } = require('./client');

const ADJ = ['swift', 'quiet', 'brave', 'lucky', 'cosmic', 'rapid', 'clever', 'mellow', 'crimson', 'golden', 'amber', 'bright', 'calm', 'coral', 'daring', 'eager', 'fierce', 'gentle', 'icy', 'jolly', 'kind', 'lunar', 'misty', 'noble', 'polar', 'proud', 'rusty', 'silver', 'solar', 'tidy', 'vivid', 'wild', 'bold', 'cozy', 'keen', 'nimble'];
const NOUN = ['eagle', 'otter', 'falcon', 'panda', 'comet', 'signal', 'raven', 'tiger', 'nebula', 'lynx', 'badger', 'birch', 'bison', 'cedar', 'cloud', 'crane', 'dove', 'ember', 'fern', 'finch', 'fox', 'heron', 'maple', 'mink', 'moose', 'orca', 'owl', 'pebble', 'pine', 'robin', 'seal', 'spruce', 'stork', 'whale', 'wren', 'brook'];
const genUser = () =>
  `${ADJ[Math.floor(Math.random() * ADJ.length)]}_${NOUN[Math.floor(Math.random() * NOUN.length)]}_${Math.floor(100 + Math.random() * 900)}`;

const PENDING = path.join(OUT, 'pending-accounts.jsonl');

function persistPending(rec) {
  fs.appendFileSync(PENDING, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n');
}

/** Retry a call a few times; throws the last error. */
async function retry(fn, { attempts = 2, delayMs = 1200 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  throw lastErr;
}

/** Phase 1 — create the account on one exit. Throws on transport failure/gate. */
async function signupOn(exit, { maxNameTries = 6 } = {}) {
  const d = new Dahl(exit, { connectTimeoutMs: 8000, timeoutMs: 30000 });
  const health = await retry(() => d.call('/health', { raw: true }), { attempts: 2 });
  if (health.status !== 200) throw new Error(`health ${health.status}`);

  let username = null;
  let lastCheck = null;
  for (let i = 0; i < maxNameTries; i++) {
    username = genUser();
    const cu = await d.checkUsername(username);
    lastCheck = cu.data;
    if (cu.status === 429) {
      const err = new Error('429 on check-username');
      err.code = 429;
      throw err;
    }
    if (cu.status === 200 && cu.data && cu.data.available) break;
    username = null;
    await sleep(250);
  }
  if (!username) throw new Error(`no available username (last check: ${JSON.stringify(lastCheck)})`);

  const su = await d.signup(username);
  if (su.status === 429) {
    const err = new Error('429 on signup');
    err.code = 429;
    throw err;
  }
  if (su.status !== 200 && su.status !== 201) {
    const err = new Error(`signup ${su.status}: ${JSON.stringify(su.data).slice(0, 220)}`);
    err.gate = true;
    throw err;
  }
  const data = su.data && typeof su.data === 'object' ? su.data : {};
  const rec = {
    username,
    fingerprint: data.fingerprint || null,
    userId: (data.user && data.user.user_id) || null,
    keyId: (data.api_key && data.api_key.id) || null,
    keyToken: (data.api_key && data.api_key.token) || null,
    keyAvailableTokensAtSignup: (data.api_key && data.api_key.available_tokens) ?? null,
    createdAt: (data.user && data.user.created_at) || null,
    signupExit: d.label(),
    // The pool files are read back as exit lists, so they need the usable line,
    // not the masked label (`http://user:***@host:port` authenticates as `***`).
    signupExitRaw: d.raw(),
    status: 'signed-up',
  };
  persistPending(rec);
  return { d, rec, data };
}

/**
 * Chat smoke test with free-tier capacity retries.
 *
 * `429 model_concurrency` ("This model is at concurrency capacity. Paid accounts
 * are admitted first.") is a service-side capacity gate, not a key defect: a
 * free account is only admitted when the model has room. Rotating over the three
 * served models with a short backoff turns a transient refusal into a pass.
 */
async function verifyChat(client, keyToken, { models, attempts = 4, gapMs = 2500 } = {}) {
  const list = models && models.length ? models : ['MiniMaxAI/MiniMax-M2.7', 'deepseek-ai/DeepSeek-V4-Flash-0731', 'zai-org/GLM-5.3-Flash'];
  let last = null;
  for (let i = 0; i < attempts; i++) {
    const model = list[i % list.length];
    const r = await client.chat(keyToken, { model, messages: [{ role: 'user', content: 'Reply with exactly: dahl-ok' }], max_tokens: 24 });
    const data = r.data && typeof r.data === 'object' ? r.data : {};
    const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || null;
    last = { model, chatStatus: r.status, content, usage: data.usage || null, error: r.status === 200 ? null : JSON.stringify(data).slice(0, 220) };
    if (r.status === 200 && content) return last;
    if (r.status !== 429) return last; // a real gate (401/402/400) — no point retrying here
    if (i < attempts - 1) await sleep(gapMs + Math.random() * 1500);
  }
  return last;
}

/**
 * Phase 2 — allocate + verify, on the given client (same exit or a fresh one).
 * `client` must be signed in (session cookie present).
 *
 * Resume-safe: the key's *current* balance is read first and only the shortfall
 * is allocated, so re-running after a lost line never double-allocates and
 * never trips the empty-pool path.
 */
async function finish(client, rec, { amount = 100000000, model = 'MiniMaxAI/MiniMax-M2.7' } = {}) {
  const bal0 = await client.keyBalance(rec.keyToken);
  // A balance read that did not answer 200 says nothing about the key: treating it
  // as "0 tokens" would re-allocate the whole grant and, on an empty pool, fail the
  // account over a lost line. Make it a transport error instead — the caller re-dials.
  if (bal0.status !== 200) throw new Error(`key balance ${bal0.status}: ${JSON.stringify(bal0.data).slice(0, 200)}`);
  const bal0Data = bal0.data && typeof bal0.data === 'object' ? bal0.data : {};
  const current =
    bal0Data.tokens ?? bal0Data.available_tokens ?? bal0Data.balance ?? bal0Data.token_balance ?? (typeof bal0Data === 'number' ? bal0Data : 0);
  rec.balanceBeforeAllocate = { status: bal0.status, tokens: current, raw: bal0Data };

  let keyId = rec.keyId;
  let shortfall = Math.max(0, amount - (Number(current) || 0));
  if (shortfall > 0) {
    const acct = await client.getAccount();
    const acctData = acct.data && typeof acct.data === 'object' ? acct.data : {};
    rec.accountAfterSignup = acctData;
    const pool = Number(acctData.token_balance ?? acctData.tokens_on_keys ?? 0);
    rec.poolBalance = pool;

    if (!keyId) {
      const keys = await client.listKeys();
      const list = (keys.data && keys.data.keys) || [];
      const found = list[0] || null;
      if (found) {
        keyId = found.id;
        rec.keyToken = found.token || rec.keyToken;
      } else {
        const created = await client.createKey('k1');
        const keyObj = (created.data && (created.data.key || created.data)) || null;
        if (!keyObj) throw new Error('no key object available');
        keyId = keyObj.id;
        rec.keyToken = keyObj.token || rec.keyToken;
      }
      rec.keyId = keyId;
    }

    const toAllocate = Math.min(shortfall, pool);
    if (toAllocate > 0) {
      const al = await client.allocate(keyId, toAllocate);
      rec.allocate = { status: al.status, data: al.data, requested: toAllocate, poolBefore: pool };
      if (al.status !== 200 && al.status !== 201) {
        const err = new Error(`allocate ${al.status}: ${JSON.stringify(al.data).slice(0, 200)}`);
        err.gate = true;
        throw err;
      }
    } else {
      rec.allocate = { status: 'skipped', requested: 0, poolBefore: pool, note: 'pool empty' };
    }
  } else {
    rec.allocate = { status: 'skipped', requested: 0, note: 'key already funded', current };
  }

  const bal = await client.keyBalance(rec.keyToken);
  const balData = bal.data && typeof bal.data === 'object' ? bal.data : {};
  rec.balance = {
    status: bal.status,
    tokens: balData.tokens ?? balData.available_tokens ?? balData.balance ?? balData.token_balance ?? null,
    raw: balData,
  };

  const chat = await verifyChat(client, rec.keyToken, { models: model ? [].concat(model) : undefined });
  rec.verify = chat;
  rec.ok = bal.status === 200 && chat.chatStatus === 200 && !!chat.content;
  rec.status = rec.ok ? 'verified' : 'unverified';
  rec.finishExit = client.label();
  // Same as signupExitRaw: what a later run needs to dial this exit again.
  rec.finishExitRaw = client.raw();
  return rec;
}

/** Sign in from a fresh exit using only the fingerprint. */
async function signInOn(exit, fingerprint) {
  const d = new Dahl(exit, { connectTimeoutMs: 8000, timeoutMs: 30000 });
  const health = await retry(() => d.call('/health', { raw: true }), { attempts: 2 });
  if (health.status !== 200) throw new Error(`health ${health.status}`);
  const si = await d.signin(fingerprint);
  if (si.status === 429) {
    const err = new Error('429 on signin');
    err.code = 429;
    throw err;
  }
  if (si.status !== 200 && si.status !== 201) {
    const err = new Error(`signin ${si.status}: ${JSON.stringify(si.data).slice(0, 200)}`);
    err.gate = true;
    throw err;
  }
  return { d, rec: { signin: si.data && typeof si.data === 'object' ? si.data : {} } };
}

module.exports = { signupOn, finish, signInOn, verifyChat, genUser, persistPending, PENDING };
