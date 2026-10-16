'use strict';

/**
 * Dahl Inference API client — session-cookie aware, proxy-only.
 *
 * Contracts reverse-engineered from the site's own bundles
 * (`/_astro/accountUi.*.js`) on 2026-10-14 and confirmed by the docs:
 *   POST /v1/auth/signup            {username}                 → {user, fingerprint, api_key}
 *   POST /v1/auth/signin            {fingerprint}              → session
 *   GET  /v1/auth/check-username    ?username=…                → {available, suggestions}
 *   GET  /v1/account                                           → account + pool
 *   POST /v1/account/keys                                      → {key:{id, token, …}}
 *   POST /v1/account/allocate       {key_id, amount}           → pool → key
 *   POST /v1/account/return         {key_id, amount}           → key → pool
 *   DELETE /v1/account/keys/{id}
 *   GET  /v1/account/usage?days=30 | /v1/account/ledger
 *   POST /tokens                                               → anonymous key
 *   GET  /tokens/current            (Bearer key)               → {…, tokens …}
 *   GET  /v1/models                 (public), POST /v1/chat/completions (Bearer key)
 */

const { request, proxyLib } = require('./lib');

const BASE = 'https://inference.dahl.global';

/** Minimal cookie jar for one Dahl session. */
class Jar {
  constructor() {
    this.cookies = new Map();
  }
  absorb(headers) {
    const raw = headers['set-cookie'];
    if (!raw) return;
    for (const line of Array.isArray(raw) ? raw : [raw]) {
      const pair = String(line).split(';')[0];
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === '' || /expires=Thu, 01 Jan 1970/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  get size() {
    return this.cookies.size;
  }
}

class Dahl {
  /**
   * @param {object|null} proxy  parsed pool exit (never null in practice)
   * @param {{connectTimeoutMs?:number,timeoutMs?:number,keepAlive?:boolean}} [opts]
   */
  constructor(proxy, opts = {}) {
    this.proxy = { ...proxy, connectTimeoutMs: opts.connectTimeoutMs || 8000, timeoutMs: opts.timeoutMs || 30000 };
    this.jar = new Jar();
    // One tunnel per client, reused across the whole account flow: re-dialling
    // the exit for every call multiplies the chance of losing the line (free
    // exits have a 1–3 minute half-life; the flow is 5–9 calls).
    this.agent = proxyLib.createAgent(this.proxy, { keepAlive: opts.keepAlive !== false, maxSockets: opts.maxSockets || 2 });
  }

  destroy() {
    try {
      this.agent.destroy();
    } catch {}
  }

  async call(path, { method = 'GET', body, headers = {}, token, raw = false } = {}) {
    const h = {
      Origin: BASE,
      Referer: `${BASE}/account`,
      Accept: 'application/json, text/plain, */*',
      ...headers,
    };
    if (this.jar.size) h.Cookie = this.jar.header();
    if (token) h.Authorization = `Bearer ${token}`;
    const res = await request(this.proxy, `${BASE}${path}`, { method, body, headers: h, agent: this.agent });
    this.jar.absorb(res.headers);
    return raw ? res : res;
  }

  async json(path, opts = {}) {
    const res = await this.call(path, opts);
    let data = null;
    try {
      data = JSON.parse(res.body);
    } catch {
      data = res.body;
    }
    return { status: res.status, data, res };
  }

  checkUsername(username) {
    return this.json(`/v1/auth/check-username?username=${encodeURIComponent(username)}`);
  }

  signup(username) {
    return this.json('/v1/auth/signup', { method: 'POST', body: { username } });
  }

  signin(fingerprint) {
    return this.json('/v1/auth/signin', { method: 'POST', body: { fingerprint } });
  }

  getAccount() {
    return this.json('/v1/account');
  }

  listKeys() {
    return this.json('/v1/account/keys');
  }

  createKey(name) {
    return this.json('/v1/account/keys', { method: 'POST', body: name ? { name } : undefined });
  }

  allocate(keyId, amount) {
    return this.json('/v1/account/allocate', { method: 'POST', body: { key_id: keyId, amount } });
  }

  returnTokens(keyId, amount) {
    return this.json('/v1/account/return', { method: 'POST', body: { key_id: keyId, amount } });
  }

  usage(days = 30) {
    return this.json(`/v1/account/usage?days=${days}`);
  }

  ledger() {
    return this.json('/v1/account/ledger');
  }

  /** Anonymous key from the landing page: `POST /tokens`. */
  async anonToken() {
    const res = await this.call('/tokens', { method: 'POST' });
    let data = null;
    try {
      data = JSON.parse(res.body);
    } catch {
      data = res.body;
    }
    return { status: res.status, data, res };
  }

  keyBalance(keyToken) {
    return this.json('/tokens/current', { token: keyToken });
  }

  models() {
    return this.json('/v1/models');
  }

  chat(keyToken, body) {
    return this.json('/v1/chat/completions', { method: 'POST', token: keyToken, body });
  }

  label() {
    return proxyLib.label(this.proxy);
  }
}

module.exports = { Dahl, Jar, BASE };
