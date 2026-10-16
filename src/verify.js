'use strict';

/**
 * Verify every key in keys.txt against the live API, through pool exits.
 *
 * Per key:  GET /tokens/current (Bearer) → balance
 *           POST /v1/chat/completions (Bearer, MiniMax-M2.7) → 200 + real content
 * Also:     GET /v1/models (public) → models.json
 *
 * Usage: node src/verify.js [--conc=6] [--model=…] [--keys=keys.txt] [--chat=1] [--limit=N]
 */

const fs = require('fs');
const path = require('path');
require('./guard').guard('verify');
const { OUT, ROOT, proxyLib, pool, loadPool, arg } = require('./lib');
const { Dahl } = require('./client');
const { verifyChat } = require('./flow');

const CONC = parseInt(arg('conc', '6'), 10);
const MODEL = arg('model', 'MiniMaxAI/MiniMax-M2.7');
const KEYS_FILE = path.resolve(ROOT, arg('keys', 'keys.txt'));
const LIMIT = parseInt(arg('limit', '0'), 10);

function exits() {
  const files = [
    path.join(OUT, 'dahl-point-of-use-live.txt'),
    path.join(OUT, 'dahl-screen-live.txt'),
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
  // Raw pool last (published layout: `proxies.txt` / `$DAHL_PROXIES`).
  for (const p of loadPool()) {
    const k = `${p.protocol}://${p.host}:${p.port}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

(async () => {
  let keys = fs
    .readFileSync(KEYS_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, LIMIT || undefined);
  // --only-missing: re-check just the keys a previous pass could not reach
  // (transport failures rotate through dead exits; the keys themselves are fine).
  if (process.argv.includes('--only-missing')) {
    const reportFile = path.join(OUT, 'verify-report.json');
    if (fs.existsSync(reportFile)) {
      const prev = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      const missing = new Set(prev.filter((r) => !r.ok).map((r) => r.key));
      const short = (k) => `${k.slice(0, 8)}…${k.slice(-4)}`;
      keys = keys.filter((k) => missing.has(short(k)));
      console.log(`[verify] only-missing: ${keys.length} keys`);
    }
  }
  const ex = exits();
  if (!ex.length) throw new Error('no exits available');
  console.log(`[verify] keys=${keys.length} exits=${ex.length} model=${MODEL}`);

  // Public model list first (one exit that works).
  let models = null;
  for (let i = 0; i < Math.min(ex.length, 10); i++) {
    try {
      const d = new Dahl(ex[i]);
      const m = await d.models();
      if (m.status === 200) {
        models = m.data;
        fs.writeFileSync(path.join(ROOT, 'models.json'), JSON.stringify(m.data, null, 2));
        console.log(`[verify] models.json written (${(m.data.data || []).length} ids) via ${d.label()}`);
        break;
      }
    } catch {}
  }

  let cursor = 0;
  let ok = 0;
  const rows = [];
  const allRows = [];
  await pool(keys, CONC, async (key, idx) => {
    const short = `${key.slice(0, 8)}…${key.slice(-4)}`;
    const row = { idx, key: short };
    for (let attempt = 0; attempt < 24; attempt++) {
      const d = new Dahl(ex[Math.floor(Math.random() * ex.length)]);
      row.exit = d.label();
      row.attempts = attempt + 1;
      try {
        const bal = await d.keyBalance(key);
        row.balanceStatus = bal.status;
        row.balance = bal.data && typeof bal.data === 'object' ? bal.data.available_tokens ?? bal.data.tokens ?? bal.data.balance : bal.data;
        const chat = await verifyChat(d, key, { models: [MODEL, 'deepseek-ai/DeepSeek-V4-Flash-0731', 'zai-org/GLM-5.3-Flash'] });
        row.model = chat.model;
        row.chatStatus = chat.chatStatus;
        row.content = chat.content;
        row.usage = chat.usage;
        row.ok = bal.status === 200 && chat.chatStatus === 200 && !!row.content;
        if (row.ok) ok++;
        break;
      } catch (e) {
        row.error = e.message;
      }
    }
    rows.push(row);
    process.stdout.write(row.ok ? '+' : (row.chatStatus || 'x'));
    return row;
  });

  console.log('');
  // Merge with earlier passes: a key that answered 200 in any pass is live; a
  // re-check only ever upgrades the report (a dead exit never downgrades it).
  const reportFile = path.join(OUT, 'verify-report.json');
  const prev = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : [];
  const merged = new Map(prev.map((r) => [r.key, r]));
  for (const r of rows) {
    const old = merged.get(r.key);
    if (!old || !old.ok || r.ok) merged.set(r.key, r);
  }
  const all = [...merged.values()];
  fs.writeFileSync(reportFile, JSON.stringify(all, null, 2));

  const allKeys = fs
    .readFileSync(KEYS_FILE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const short = (k) => `${k.slice(0, 8)}…${k.slice(-4)}`;
  const liveSet = new Set(all.filter((r) => r.ok).map((r) => r.key));
  const liveKeys = allKeys.filter((k) => liveSet.has(short(k)));
  fs.writeFileSync(path.join(OUT, 'verify-live-keys.txt'), liveKeys.join('\n') + (liveKeys.length ? '\n' : ''));
  console.log(`[verify] this pass ${ok}/${keys.length}; cumulative live ${liveKeys.length}/${allKeys.length}; live keys → outputs/verify-live-keys.txt`);
})();
