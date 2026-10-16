'use strict';

/**
 * Measure the chat-side rate limit (code `model_concurrency`) for one key:
 * N completions spaced `--gap=` ms apart through one keep-alive tunnel, each
 * logged with status/code/message/latency. Optionally repeats per model.
 *
 * Usage: node measure-chat-limit.js --token=dahl_… [--n=6 --gap=3500 --models=a,b]
 */

const fs = require('fs');
const path = require('path');
const { OUT, proxyLib, sleep, arg } = require('./lib');
const { Dahl } = require('./client');

require('./guard').guard('measure-chat');

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

(async () => {
  const token = arg('token');
  const n = parseInt(arg('n', '6'), 10);
  const gap = parseInt(arg('gap', '3500'), 10);
  const models = (arg('models', 'MiniMaxAI/MiniMax-M2.7')).split(',');
  if (!token) throw new Error('--token required');

  const list = exits();
  const out = { token: token.slice(0, 9) + '…', gapMs: gap, n, models: {} };

  for (const model of models) {
    const maxAttempts = Math.min(list.length, 10);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const d = new Dahl(list[attempt], { maxSockets: 1 });
      const rows = [];
      let transport = false;
      for (let i = 0; i < n; i++) {
        const t = Date.now();
        try {
          const r = await d.chat(token, { model, messages: [{ role: 'user', content: `Say ok (${i})` }], max_tokens: 12 });
          const err = r.data && r.data.error;
          rows.push({ i, status: r.status, code: err && err.code, message: err && err.message, ms: Date.now() - t });
        } catch (e) {
          rows.push({ i, transportError: e.message, ms: Date.now() - t });
          transport = true;
          break;
        }
        if (i < n - 1) await sleep(gap);
      }
      if (!transport || attempt === maxAttempts - 1) {
        out.models[model] = { exit: d.label(), attempts: attempt + 1, rows };
        break;
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'chat-limit.json'), JSON.stringify(out, null, 2));
  for (const [m, v] of Object.entries(out.models)) {
    const summary = (v.rows || []).map((r) => (r.transportError ? 'T' : r.status));
    console.log(`${m} gap=${gap} → ${summary.join(' ')}`);
  }
})();
