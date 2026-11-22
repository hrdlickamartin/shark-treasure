import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENTRY = join(ROOT, 'App.tsx');
const REQUIRED = 'ěščřžýáíéúůťďňóĚŠČŘŽÝÁÍÉÚŮŤĎŇÓ';
const require = createRequire(join(ROOT, 'package.json'));

function codepoints(path) {
  const d = readFileSync(path);
  const tables = d.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) {
    const rec = 12 + 16 * i;
    if (d.toString('latin1', rec, rec + 4) === 'cmap') cmap = d.readUInt32BE(rec + 8);
  }
  if (cmap < 0) throw new Error(`${path}: chybí tabulka cmap`);
  const cps = new Set();
  const subtables = d.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const start = cmap + d.readUInt32BE(cmap + 4 + 8 * i + 4);
    const format = d.readUInt16BE(start);
    if (format === 4) {
      const seg = d.readUInt16BE(start + 6) / 2;
      for (let s = 0; s < seg; s++) {
        const end = d.readUInt16BE(start + 14 + 2 * s);
        const begin = d.readUInt16BE(start + 16 + 2 * seg + 2 * s);
        for (let c = begin; c <= end; c++) cps.add(c);
      }
    } else if (format === 12) {
      const groups = d.readUInt32BE(start + 12);
      for (let g = 0; g < groups; g++) {
        const base = start + 16 + 12 * g;
        for (let c = d.readUInt32BE(base); c <= d.readUInt32BE(base + 4); c++) cps.add(c);
      }
    }
  }
  return cps;
}

const source = readFileSync(ENTRY, 'utf8');
const imports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(@expo-google-fonts\/[^']+)'/g)];
if (imports.length === 0) {
  console.error('✗ V App.tsx jsem nenašel žádné fonty z @expo-google-fonts');
  process.exit(1);
}

let failed = false;
let count = 0;
for (const [, names, pkg] of imports) {
  for (const name of names.split(',').map((n) => n.trim()).filter(Boolean)) {
    const weight = name.slice(name.indexOf('_') + 1);
    const file = require.resolve(`${pkg}/${weight}/${name}.ttf`);
    const cps = codepoints(file);
    const missing = [...REQUIRED].filter((ch) => !cps.has(ch.codePointAt(0)));
    count++;
    if (missing.length) {
      failed = true;
      console.error(`✗ ${name} (${pkg}) nemá české znaky: ${missing.join('')}`);
    }
  }
}
if (failed) process.exit(1);
console.log(`✓ Všech ${count} fontů z App.tsx pokrývá českou diakritiku`);
