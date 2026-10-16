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
 *   node cli.js --count N             screen exits, mint, allocate, verify (default 30, no cap)
 *   node cli.js --verify-only         re-verify every key in keys.txt
 *   node cli.js --screen              only screen proxy exits
 *   node cli.js --connect-9router     after the run, register every key in keys.txt with 9Router
 *   node cli.js --help
 *
 * Egress: every Dahl request goes through an HTTP(S)/SOCKS exit from your pool
 * file (`proxies.txt` next to the repo, or $DAHL_PROXIES). There is no direct
 * fallback anywhere in this tool.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; };

if (args.includes('--help') || args.includes('-h')) {
  console.log(require('fs').readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8').split('## ⚙️')[1] || 'see README.md');
  console.log('  --connect-9router  register every key in keys.txt with 9Router after the run');
  process.exit(0);
}

const child = args.includes('--screen')
  ? ['screen.js']
  : args.includes('--verify-only')
    ? ['verify.js', ...args.filter((a) => a !== '--verify-only')]
    : ['mint.js', '--count', String(arg('--count', '30'))];

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
