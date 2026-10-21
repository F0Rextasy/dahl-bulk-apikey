'use strict';

/**
 * Dahl Inference — shared plumbing.
 *
 * Everything HTTP that talks to Dahl goes through a pool proxy via a standalone
 * CONNECT/SOCKS tunnelling module when a pool is supplied. With no pool at all
 * the shared `request()` connects directly: a list is recommended at scale
 * (per-IP limits, bans) but it is optional.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const proxyLib = require('./proxy');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'outputs');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
// Per-account fingerprint (operator standard v3): each account task runs inside
// withUa(...) so its requests carry their own UA from ua-pool (SD_UA pins one UA
// for a one-off run; SD_UA_POOL supplies a file path or an inline list).
const { AsyncLocalStorage } = require('async_hooks');
const { uaPool } = require('./ua-pool');
const SESS = new AsyncLocalStorage();
const activeUa = () => { const s = SESS.getStore(); return (s && s.ua) || UA; };
const withUa = (ua, fn) => SESS.run({ ua: ua || uaPool()[0] }, fn);

/** Pool files, freshest first.
 *
 * `$DAHL_PROXIES` as a comma/semicolon-separated path list comes first, then
 * `proxies.txt` at the checkout root; missing files are skipped. An empty pool
 * means DIRECT mode upstream (`[null]` is the direct sentinel).
 */
const POOL_FILES = [
  ...String(process.env.DAHL_PROXIES || '')
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean),
  path.resolve(ROOT, 'proxies.txt'),
].filter(Boolean);

function loadPool(files = POOL_FILES) {
  const out = [];
  const seen = new Set();
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

/** Lines a pool reader would treat as candidates: not blank, not a comment. */
function poolCandidateLines(file) {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+(#|\/\/).*$/, '').trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  } catch {
    return [];
  }
}

/**
 * Exits for a run, or `[null]` — the direct sentinel — when no pool is
 * configured at all. A file that exists with candidate lines but yields no
 * usable exit (a junk pool, an all-socks4 list, a saved HTML page) is NOT
 * "no pool": going direct would put every request on this machine's own
 * address, silently, so it throws instead.
 */
function poolOrDirect(files, tag) {
  const list = loadPool(files);
  if (list.length) return list;
  const broken = files.filter((f) => fs.existsSync(f)).map((f) => ({ f, lines: poolCandidateLines(f) })).filter((x) => x.lines.length);
  if (broken.length) {
    const { f, lines } = broken[0];
    throw new Error(
      `${tag}: ${f} has ${lines.length} candidate line(s) but no usable exit — a line must be host:port, host:port:user:pass, user:pass@host:port, scheme://… or host|port|user|pass (socks4 lines are dropped, unparsable lines are skipped). Fix the pool, or delete the file to run direct.`
    );
  }
  console.log(`[${tag}] no proxy list — running WITHOUT a proxy (direct). Put exits in proxies.txt (or $DAHL_PROXIES) to route through them.`);
  return [null];
}

/** Per-attempt proxy config: short connect, generous TLS handshake budget. */
function tuned(proxy, { connectTimeoutMs = 8000, timeoutMs = 30000, keepAlive = false } = {}) {
  return proxy ? { ...proxy, connectTimeoutMs, timeoutMs, keepAlive } : null;
}

/**
 * One HTTPS request through `proxy` (null = direct; a pool is optional).
 * Resolves with `{ ok, status, headers, body, location }`
 * or rejects on transport failure.
 */
function request(proxy, url, { method = 'GET', headers = {}, body, timeoutMs = 30000, connectTimeoutMs = 8000, agent } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const payload =
      body === undefined || body === null
        ? null
        : Buffer.isBuffer(body)
          ? body
          : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const h = { 'User-Agent': activeUa(), Accept: '*/*', ...headers };
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) h['Content-Type'] = 'application/json';
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-length')) h['Content-Length'] = payload.length;
    h['Accept-Language'] = h['Accept-Language'] || 'en-US,en;q=0.9';

    const agentFor = (p) => (u.protocol === 'https:' ? proxyLib.createAgent(p) : proxyLib.createHttpAgent(p));
    const req = lib.request(
      {
        method,
        host: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        agent: agent || (proxy ? agentFor(tuned(proxy, { timeoutMs, connectTimeoutMs })) : undefined),
        headers: h,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
            location: res.headers.location,
          })
        );
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`request timeout ${timeoutMs}ms`)));
    req.on('error', (e) => reject(e));
    if (payload) req.write(payload);
    req.end();
  });
}

/** Parses a JSON response body; throws with the raw body on failure. */
function parseJson(res) {
  try {
    return JSON.parse(res.body);
  } catch {
    const err = new Error(`non-JSON (${res.status}): ${res.body.slice(0, 300)}`);
    err.status = res.status;
    err.body = res.body;
    throw err;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * CLI argument reader that accepts both spellings — `--name=value` and
 * `--name value` — because the packaged entry point (`cli.js`) spawns the tools
 * with the space-separated form. A `--name` with no following value (or a
 * following token that starts with `--`) counts as a boolean flag.
 */
function arg(name, dflt) {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i >= 0) {
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) return next;
    return true;
  }
  return dflt;
}

/** A flag with no value (`--conc`) parses as boolean true: treat it as unset. */
function num(v) {
  if (v == null || v === true) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/** Numeric flag: a bare `--count` (or junk) keeps the documented default, never NaN. */
function numArg(name, dflt) {
  const n = num(arg(name, null));
  return n == null ? dflt : n;
}

/** Boolean flag: `--name` present → true. */
function flag(name) {
  return process.argv.slice(2).some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
}

/** Bounded-concurrency map with per-item error capture. */
async function pool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = { ok: true, value: await fn(items[idx], idx) };
      } catch (e) {
        results[idx] = { ok: false, error: e.message || String(e) };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + '\n');
}

function rand(n, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

module.exports = { UA, ROOT, OUT, POOL_FILES, loadPool, poolCandidateLines, poolOrDirect, tuned, request, parseJson, sleep, arg, num, numArg, flag, pool, appendJsonl, rand, proxyLib, label: proxyLib.label, activeUa, withUa };
