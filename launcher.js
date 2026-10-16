#!/usr/bin/env node
'use strict';

/**
 * Interactive launcher for the compiled build.
 *
 * The CLI itself is obfuscated, so its options are not obvious from reading it;
 * this launcher asks for them, remembers the answers in `launcher.config.json`,
 * and then runs the CLI with the right flags — including the proxy list, which
 * is the setting people most often need and cannot guess.
 *
 * Usage: node launcher.js            (menu)
 *        node launcher.js --help
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');

const CONFIG = path.join(__dirname, 'launcher.config.json');
const CLI = path.join(__dirname, 'cli.js');

const defaults = {
  count: 30,
  proxyFile: process.env.DAHL_PROXIES || 'proxies.txt',
  model: 'MiniMaxAI/MiniMax-M2.7',
  amount: 100000000,
  routerBase: 'http://localhost:20128',
  routerPassword: '123456',
};

function loadConfig() {
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')) };
  } catch (e) {
    return { ...defaults };
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
  } catch (e) {
    console.error(`  ! could not write ${path.basename(CONFIG)}: ${e.message}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question, fallback) =>
  new Promise((resolve) => {
    const hint = fallback ? ` [${String(fallback).slice(0, 30)}${String(fallback).length > 30 ? '…' : ''}]` : '';
    rl.question(`  ${question}${hint}: `, (answer) => resolve(answer.trim() || fallback || ''));
  });

function run(args, env = {}) {
  console.log('');
  const res = spawnSync(process.execPath, [CLI, ...args], {
    windowsHide: true,
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (res.status !== 0) console.log(`  ! exited with code ${res.status}`);
}

const BANNER_LOGO = String.raw`
███████╗ ██████╗ ██████╗ ███████╗██╗  ██╗████████╗ █████╗ ███████╗██╗   ██╗
██╔════╝██╔═████╗██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██╔════╝╚██╗ ██╔╝
█████╗  ██║██╔██║██████╔╝█████╗   ╚███╔╝    ██║   ███████║███████╗ ╚████╔╝
██╔══╝  ████╔╝██║██╔══██╗██╔══╝   ██╔██╗    ██║   ██╔══██║╚════██║  ╚██╔╝
██║     ╚██████╔╝██║  ██║███████╗██╔╝ ██╗   ██║   ██║  ██║███████║   ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝
`;

function banner() {
  const cyan = '\x1b[36m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';
  const lines = BANNER_LOGO.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  const width = Math.max(...lines.map((l) => [...l].length));
  const pad = (s) => s + ' '.repeat(width - [...s].length);
  const inner = width + 4;
  console.log('');
  console.log(`${cyan}╔${'═'.repeat(inner)}╗${reset}`);
  console.log(`${cyan}║${' '.repeat(inner)}║${reset}`);
  for (const line of lines) console.log(`${cyan}║${reset}  ${bold}${pad(line)}${reset}  ${cyan}║${reset}`);
  console.log(`${cyan}║${' '.repeat(inner)}║${reset}`);
  console.log(`${cyan}║${reset}  ${pad('dahl-bulk-apikey')}  ${cyan}║${reset}`);
  console.log(`${cyan}║${reset}  ${dim}${pad('one account per key — 100M tokens each')}${reset}  ${cyan}║${reset}`);
  console.log(`${cyan}║${' '.repeat(inner)}║${reset}`);
  console.log(`${cyan}╚${'═'.repeat(inner)}╝${reset}`);
  console.log(`  ${dim}dahl-bulk-apikey contributors${reset}`);
  console.log('');
}

async function mintFlow(cfg) {
  cfg.count = parseInt(await ask('How many accounts/keys do you want (any number)', cfg.count), 10) || cfg.count;
  cfg.proxyFile = await ask('Proxy list file (one proxy per line)', cfg.proxyFile);
  cfg.model = await ask('Model used for the live verification', cfg.model);
  cfg.amount = parseInt(await ask('Welcome grant to allocate per key', cfg.amount), 10) || cfg.amount;
  saveConfig(cfg);

  if (!fs.existsSync(path.resolve(__dirname, '..', cfg.proxyFile)) && !fs.existsSync(cfg.proxyFile)) {
    console.log(`  ! ${cfg.proxyFile} not found — put one proxy per line there first`);
    console.log('    (http://host:port, socks5://host:port or host:port) — this tool never dials direct');
    return;
  }
  run(['--count', String(cfg.count)], { DAHL_PROXIES: cfg.proxyFile, DAHL_MODEL: cfg.model, DAHL_AMOUNT: String(cfg.amount) });
}

async function verifyFlow(cfg) {
  cfg.proxyFile = await ask('Proxy list file', cfg.proxyFile);
  saveConfig(cfg);
  run(['--verify-only'], { DAHL_PROXIES: cfg.proxyFile });
}

async function screenFlow(cfg) {
  cfg.proxyFile = await ask('Proxy list file to screen', cfg.proxyFile);
  saveConfig(cfg);
  run(['--screen'], { DAHL_PROXIES: cfg.proxyFile });
}

async function connectFlow(cfg) {
  const { connectKeysFile, connect9Router } = require('./connect-9router.js');
  cfg.routerBase = await ask('9Router base URL', cfg.routerBase);
  cfg.routerPassword = await ask('9Router password', cfg.routerPassword);
  saveConfig(cfg);
  console.log('');
  try {
    await connectKeysFile({ base: cfg.routerBase, password: cfg.routerPassword });
  } catch (e) {
    if (!/no API keys/.test(e.message)) throw e;
    console.log(`  ! ${e.message}`);
    const apiKey = await ask('Single Dahl Inference key to register');
    if (apiKey) await connect9Router({ base: cfg.routerBase, password: cfg.routerPassword, apiKey });
  }
}

async function main() {
  const cfg = loadConfig();
  banner();
  console.log('  1) Mint keys      — sign up one account per key, allocate the grant, verify');
  console.log('  2) Verify keys    — re-check every key with a live chat completion');
  console.log('  3) Screen proxies — test your proxy list for exits that reach Dahl');
  console.log('  4) Settings       — show what this launcher remembers');
  console.log('  5) Help           — CLI options and notes');
  console.log('  6) Connect to 9Router — register the keys in keys.txt with a local 9Router');
  console.log('  q) Quit\n');
  const choice = (await ask('Choose', '1')).toLowerCase();

  if (choice === '1') await mintFlow(cfg);
  else if (choice === '2') await verifyFlow(cfg);
  else if (choice === '3') await screenFlow(cfg);
  else if (choice === '4') console.log('\n' + JSON.stringify(cfg, null, 2));
  else if (choice === '5') run(['--help']);
  else if (choice === '6') await connectFlow(cfg);
  rl.close();
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Interactive launcher: run `node launcher.js` and pick a menu item.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
