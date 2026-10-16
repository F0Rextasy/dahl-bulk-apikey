'use strict';

/**
 * Crude HTML → text: strips script/style, tags, and decodes the handful of
 * entities the Dahl docs actually use. Enough to read documentation prose.
 *
 * Usage: node text.js <file.html> [pattern]
 */

const fs = require('fs');

const file = process.argv[2];
const pattern = process.argv[3];
let html = fs.readFileSync(file, 'utf8');

html = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

// Keep block boundaries as newlines before stripping tags.
html = html
  .replace(/<\/(p|div|li|tr|h[1-6]|pre|code|section|article|td|th)>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n');

html = html.replace(/<[^>]+>/g, ' ');

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#x3D;/g, '=')
    .replace(/&#x60;/g, '`');

html = decode(html);
const text = html
  .split('\n')
  .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n');

if (pattern) {
  const re = new RegExp(pattern, 'i');
  const lines = text.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (re.test(l)) hits.push(lines.slice(Math.max(0, i - 2), i + 6).join('\n') + '\n---');
  });
  console.log(hits.join('\n') || '(no match)');
} else {
  console.log(text);
}
