#!/usr/bin/env node
// Fails when a key exists in one locale but not the other, or when the code
// uses a key that does not exist. Run with: npm run i18n:check
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['pt-PT', 'en-GB'];
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

const read = (lng) => JSON.parse(readFileSync(new URL(`../src/locales/${lng}.json`, import.meta.url), 'utf8'));

function flatten(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out);
    else out.set(path, child);
  }
  return out;
}

/** "fines.count_one" -> "fines:count" */
function toLookupKey(flatKey) {
  const [ns, ...rest] = flatKey.split('.');
  let key = rest.join('.');
  const suffix = PLURAL_SUFFIXES.find((s) => key.endsWith(s));
  if (suffix) key = key.slice(0, -suffix.length);
  return `${ns}:${key}`;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(full)) files.push(full);
  }
  return files;
}

const problems = [];
const maps = Object.fromEntries(LOCALES.map((lng) => [lng, flatten(read(lng))]));

// 1. Same keys in both files.
for (const [a, b] of [LOCALES, [...LOCALES].reverse()]) {
  for (const key of maps[a].keys()) {
    if (!maps[b].has(key)) problems.push(`Chave "${key}" existe em ${a} mas falta em ${b}`);
  }
}

// 2. No empty strings.
for (const lng of LOCALES) {
  for (const [key, value] of maps[lng]) {
    if (typeof value !== 'string' || value.trim() === '') problems.push(`Chave "${key}" em ${lng} está vazia ou não é texto`);
  }
}

// 3. Same interpolation placeholders in both languages.
const placeholders = (text) => [...String(text).matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map((m) => m[1]).sort();
for (const [key, value] of maps[LOCALES[0]]) {
  const other = maps[LOCALES[1]].get(key);
  if (other === undefined) continue;
  const a = placeholders(value).join(',');
  const b = placeholders(other).join(',');
  if (a !== b) problems.push(`Chave "${key}": interpolações diferentes (${LOCALES[0]}: ${a || '—'} / ${LOCALES[1]}: ${b || '—'})`);
}

// 4. Keys used in the code must exist (plural forms count as present).
const known = new Set([...maps[LOCALES[0]].keys()].map(toLookupKey));
const knownList = [...known];
/** A template key such as `members:position.${x}` is fine if some key starts with it. */
const hasPrefix = (prefix) => knownList.some((key) => key.startsWith(prefix));

let used = 0;
for (const file of walk(new URL('../src', import.meta.url).pathname)) {
  const source = readFileSync(file, 'utf8');
  const rel = file.slice(file.indexOf('/src/') + 1);

  // t('ns:key') / t("ns:key")
  for (const match of source.matchAll(/\bt\(\s*['"]([a-zA-Z]+:[\w.]+)['"]/g)) {
    used++;
    if (!known.has(match[1])) problems.push(`${rel}: usa a chave inexistente "${match[1]}"`);
  }
  // t(`ns:prefix.${...}`) — check that the static prefix exists
  for (const match of source.matchAll(/\bt\(\s*`([a-zA-Z]+:[\w.]*)\$\{/g)) {
    used++;
    if (!hasPrefix(match[1])) problems.push(`${rel}: prefixo de chave inexistente "${match[1]}\${…}"`);
  }
  // shareTexts.ts: t is bound to the `share` namespace
  if (rel.endsWith('lib/shareTexts.ts')) {
    for (const match of source.matchAll(/\bt\(\s*['"]([\w.]+)['"]/g)) {
      used++;
      if (!known.has(`share:${match[1]}`)) problems.push(`${rel}: usa a chave inexistente "share:${match[1]}"`);
    }
    for (const match of source.matchAll(/\bt\(\s*`([\w.]*)\$\{/g)) {
      used++;
      if (!hasPrefix(`share:${match[1]}`)) problems.push(`${rel}: prefixo de chave inexistente "share:${match[1]}\${…}"`);
    }
  }
  // activity.ts: h('event') -> admin:history.events.event
  if (rel.endsWith('lib/activity.ts')) {
    for (const match of source.matchAll(/\bh\(\s*'(\w+)'/g)) {
      used++;
      if (!known.has(`admin:history.events.${match[1]}`)) problems.push(`${rel}: evento sem tradução "admin:history.events.${match[1]}"`);
    }
  }
}

const totals = `${maps[LOCALES[0]].size} chaves por idioma · ${used} utilizações verificadas no código`;
if (problems.length > 0) {
  console.error(`✖ i18n:check falhou (${totals})\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`✔ i18n:check passou (${totals})`);
