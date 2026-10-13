// Builds dist/ for static hosting (GitHub Pages): the page, the sample inputs and
// the recorded real AMD runs. There is no server there, so the page runs in replay mode.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cases.json'), 'utf8')).map(({ id, title, narrative }) => ({ id, title, narrative }));
fs.writeFileSync(path.join(DIST, 'cases.json'), JSON.stringify(cases));

const rdir = path.join(DIST, 'replays');
fs.mkdirSync(rdir, { recursive: true });
const src = path.join(ROOT, 'data', 'replays');
const index = [];
for (const f of fs.readdirSync(src).filter((x) => x.endsWith('.json') && x !== 'index.json')) {
  fs.copyFileSync(path.join(src, f), path.join(rdir, f));
  const r = JSON.parse(fs.readFileSync(path.join(src, f), 'utf8'));
  index.push({ id: r.id, title: r.title });
}
fs.writeFileSync(path.join(rdir, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`dist/ ready: ${cases.length} samples, ${index.length} recorded runs`);
