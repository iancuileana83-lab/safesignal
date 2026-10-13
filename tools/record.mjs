// Records REAL runs against the configured endpoint as replays for the live demo.
// Refuses to run unless BACKEND_KIND=amd and HARDWARE_LABEL is set, so a stand-in
// can never end up labelled as an AMD recording.
//
//   npm run record

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, probe, extract } from '../src/llm.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadConfig();

if (cfg.kind !== 'amd' || !cfg.hardware) {
  console.error('Refusing to record: set BACKEND_KIND=amd and HARDWARE_LABEL (e.g. "AMD Instinct MI300X, ROCm, vLLM") in .env, pointing at the real AMD endpoint.');
  process.exit(1);
}
const p = await probe(cfg);
if (!p.reachable) {
  console.error('The endpoint is not reachable: ' + cfg.baseUrl);
  process.exit(1);
}

const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cases.json'), 'utf8'));
const outDir = path.join(ROOT, 'data', 'replays');
fs.mkdirSync(outDir, { recursive: true });

for (const c of cases) {
  const r = await extract(c.narrative, cfg);
  const { meta, ...result } = r;
  const rec = {
    id: c.id,
    title: c.title,
    narrative: c.narrative,
    result,
    meta: { ...meta, recordedAt: new Date().toISOString() },
  };
  fs.writeFileSync(path.join(outDir, c.id + '.json'), JSON.stringify(rec, null, 2));
  console.log(`recorded ${c.id}: ${meta.latencyMs} ms, ${meta.tokensPerSec ?? '?'} tokens/s`);
}
console.log('Done. Commit data/replays/ so the hosted demo can replay these real runs.');
