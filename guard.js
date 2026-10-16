'use strict';

/**
 * Never let a stray socket error kill a long mint run.
 *
 * Free exits die mid-handshake; the proxy agent can then surface an error on a
 * promise nobody is awaiting (observed: an uncaught `proxy CONNECT timeout`
 * stack from `Timeout._onTimeout` terminated a run after a successful signin).
 * The flows already treat transport errors as "this exit is dead, take the next
 * one", so the only correct global handler is: log, keep going.
 */

const fs = require('fs');
const path = require('path');

const LOG = path.resolve(__dirname, '..', 'outputs', 'process-errors.log');

function guard(label) {
  const note = (kind, err) => {
    try {
      fs.mkdirSync(path.dirname(LOG), { recursive: true });
      fs.appendFileSync(LOG, `${new Date().toISOString()} [${label}] ${kind}: ${(err && (err.stack || err.message)) || err}\n`);
    } catch {}
  };
  process.on('unhandledRejection', (err) => note('unhandledRejection', err));
  process.on('uncaughtException', (err) => note('uncaughtException', err));
}

module.exports = { guard };
