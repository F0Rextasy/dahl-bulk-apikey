// Per-account fingerprint pool (operator standard v3). No two accounts share a
// UA line: the UA drives the viewport + timezone + locale so the set moves
// together and a fleet varies.
//   SD_UA       one-off pin for a single run (backward-compatible override)
//   SD_UA_POOL  a file path or a comma-separated list of UAs
//   neither     the built-in 4-item realistic Chrome 151-155 pool, picked by
//               account index (deterministic; index 1 -> entry 0)
'use strict';
const fs = require('fs');

const BUILTIN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
];
const VIEWPORTS = ['1280x900', '1366x768', '1440x900', '1536x864'];
const LOCALES = ['tr-TR,tr;q=0.9,en;q=0.8', 'en-US,en;q=0.9', 'de-DE,de;q=0.9,en;q=0.8', 'en-GB,en;q=0.9'];
const TIMEZONES = ['Europe/Istanbul', 'America/New_York', 'Europe/Berlin', 'Europe/London'];
const TZ_BY_COUNTRY = { TR: 'Europe/Istanbul', US: 'America/New_York', CA: 'America/Toronto', BR: 'America/Sao_Paulo', GB: 'Europe/London', DE: 'Europe/Berlin', FR: 'Europe/Paris', NL: 'Europe/Amsterdam', PL: 'Europe/Warsaw', RU: 'Europe/Moscow', UA: 'Europe/Kyiv', IN: 'Asia/Kolkata', JP: 'Asia/Tokyo', SG: 'Asia/Singapore', AU: 'Australia/Sydney', IR: 'Asia/Tehran' };

/** SD_UA pin, else SD_UA_POOL (file path or inline list), else the built-in pool. */
function uaPool(env = process.env) {
  if (env.SD_UA) return [String(env.SD_UA)]; // single one-off pin
  const spec = env.SD_UA_POOL;
  if (spec) {
    let lines;
    try {
      lines = fs.readFileSync(String(spec), 'utf8').split(/\r?\n/); // a file path
    } catch (e) {
      lines = String(spec).split(/\s*,\s*/); // an inline list
    }
    const list = lines.map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
    if (list.length) return list;
  }
  return BUILTIN_UAS.slice();
}

/** Deterministic, non-repeating per account: index 1 -> pool[0], 2 -> pool[1] ... */
function fingerprintFor(index, env = process.env) {
  const n = Number(index) || 1;
  const pool = uaPool(env);
  const i = Math.max(0, n - 1);
  return {
    index: n,
    ua: pool[i % pool.length],
    viewport: VIEWPORTS[i % VIEWPORTS.length],
    locale: LOCALES[i % LOCALES.length],
    timezone: TIMEZONES[i % TIMEZONES.length],
  };
}

const uaFor = (index, env) => fingerprintFor(index, env).ua;
/** Timezone that matches the exit proxy's country (falls back to the index pick). */
const timezoneForCountry = (cc, index) => TZ_BY_COUNTRY[String(cc || '').toUpperCase()] || fingerprintFor(index).timezone;

module.exports = { BUILTIN_UAS, VIEWPORTS, LOCALES, TIMEZONES, uaPool, fingerprintFor, uaFor, timezoneForCountry };
