#!/usr/bin/env node
'use strict';

/**
 * dahl-bulk-apikey — one Dahl Inference account per API key, any number of them.
 *
 * Dahl signs up over pure REST (`POST /v1/auth/signup {username}` → 201 with a
 * fingerprint and an API key), gives every account a welcome token grant, and
 * needs no e-mail, phone or card. This tool mints one account per key, allocates
 * the grant to that key, and only writes a key after a live chat completion.
 *
 * Usage:
 *   node src/cli.js --count N             screen exits, mint, allocate, verify (default 30, no cap)
 *   node src/cli.js --verify-only         re-verify every key in keys.txt
 *   node src/cli.js --screen              only screen proxy exits
 *   node src/cli.js --connect-9router     after the run, register every key in keys.txt with 9Router
 *   node src/cli.js help                  print mint's flags
 *   node src/cli.js --preset=turbo --count N   run shape: turbo = 5 workers / 3 s
 *   node src/cli.js --help
 *
 * Egress: your proxy list is OPTIONAL — put exits in `proxies.txt` at the
 * repository root (or set $DAHL_PROXIES) and every Dahl request leaves through
 * an HTTP(S)/SOCKS exit from that list. Without a list the tool connects
 * directly (a pool is recommended at scale: per-IP limits, bans).
 * Presets (operator standard v3): `--preset=turbo|balanced|safe` (and explicit
 * `--conc=`/`--gap=`) reach mint.js unchanged; absent = today's defaults.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);

/** Mint flags this entry point forwards untouched (the `--flag=value` form). */
const MINT_FLAGS = ['--preset=', '--conc=', '--gap=', '--amount=', '--model=', '--exits=', '--jiggle='];
// A bare flag (or one followed by another flag) keeps the default: `--count`
// alone used to become the literal string "undefined" and mint nothing.
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next === undefined || next.startsWith('--') ? fallback : next;
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(require('fs').readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8').split('## ⚙️')[1] || 'see README.md');
  console.log('  --connect-9router  register every key in keys.txt with 9Router after the run');
  process.exit(0);
}

if (args[0] === 'help') {
  const res = spawnSync(process.execPath, [path.join(__dirname, 'mint.js'), '--help'], {
    windowsHide: true,
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
  process.exit(res.status ?? 0);
}

const child = args.includes('--screen')
  ? ['screen.js']
  : args.includes('--verify-only')
    ? ['verify.js', ...args.filter((a) => a !== '--verify-only')]
    // Mint's own `--flag=value` flags are forwarded as-is; `--count` is passed
    // separately because a bare `--count` must still resolve to the default.
    : ['mint.js', '--count', String(arg('--count', '30')), ...process.argv.slice(2).filter((a) => MINT_FLAGS.some((f) => a.startsWith(f)))]

const res = spawnSync(process.execPath, [path.join(__dirname, child[0]), ...child.slice(1)], {
  windowsHide: true,
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

if (args.includes('--connect-9router')) {
  const { connectKeysFile, parseRouterArgs } = require('./connect-9router.js');
  connectKeysFile(parseRouterArgs(args))
    .then(() => {
      process.exitCode = res.status ?? 0;
    })
    .catch((e) => {
      console.error(`[9router] ${e.message}`);
      process.exitCode = 1;
    });
} else {
  process.exit(res.status ?? 0);
}
