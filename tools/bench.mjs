// Benchmark against the configured endpoint: quality on the fictional sample set,
// latency and throughput at several concurrency levels. Results are measured, never
// typed in. The output file states which backend produced them.
//
//   npm run bench                      (REPEATS=3 LEVELS=1,4,8,16)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, probe, extract } from '../src/llm.mjs';
import { assess, val } from '../public/js/rules.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = loadConfig();
const REPEATS = Number(process.env.REPEATS || 3);
const LEVELS = (process.env.LEVELS || '1,4,8,16').split(',').map(Number);

const p = await probe(cfg);
if (!p.reachable) {
  console.error('Endpoint not reachable: ' + (cfg.baseUrl || '(LLM_BASE_URL unset)'));
  process.exit(1);
}
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'cases.json'), 'utf8'));

const pct = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] : null;
};

// quality: sequential, one pass per repeat
const quality = { runs: 0, jsonOk: 0, medicine: 0, sex: 0, outcome: 0, triage: 0, grounded: 0, filled: 0 };
const latencies = [];
for (let r = 0; r < REPEATS; r++) {
  for (const c of cases) {
    quality.runs++;
    try {
      const out = await extract(c.narrative, cfg);
      quality.jsonOk++;
      latencies.push(out.meta.latencyMs);
      const f = out.fields;
      const g = c.gold;
      if (val(f, 'medicine_name').toLowerCase() === g.medicine_name) quality.medicine++;
      if (val(f, 'patient_sex') === g.patient_sex) quality.sex++;
      if (val(f, 'outcome') === g.outcome) quality.outcome++;
      if (assess(f, c.narrative).triage.level === g.triage) quality.triage++;
      const filled = Object.values(f).filter((x) => (Array.isArray(x.value) ? x.value.length : x.value));
      quality.filled += filled.length;
      quality.grounded += filled.filter((x) => x.grounded !== false).length;
    } catch (e) {
      console.error(`  ${c.id}: ${e.message}`);
    }
  }
}

// throughput: fire N requests at each concurrency level
const load = [];
for (const level of LEVELS) {
  const jobs = [];
  for (let i = 0; i < Math.max(level * 2, 8); i++) jobs.push(cases[i % cases.length]);
  const lat = [];
  let tokens = 0;
  let failed = 0;
  const t0 = performance.now();
  let next = 0;
  await Promise.all(
    Array.from({ length: level }, async () => {
      while (next < jobs.length) {
        const c = jobs[next++];
        try {
          const o = await extract(c.narrative, cfg);
          lat.push(o.meta.latencyMs);
          tokens += o.meta.completionTokens || 0;
        } catch {
          failed++;
        }
      }
    }),
  );
  const sec = (performance.now() - t0) / 1000;
  load.push({
    concurrency: level,
    requests: jobs.length,
    failed,
    wallSeconds: Math.round(sec * 100) / 100,
    reportsPerSecond: Math.round((lat.length / sec) * 100) / 100,
    completionTokensPerSecond: Math.round(tokens / sec),
    latencyMsP50: pct(lat, 0.5),
    latencyMsP95: pct(lat, 0.95),
  });
  console.log(`concurrency ${level}: ${load.at(-1).reportsPerSecond} reports/s, p50 ${load.at(-1).latencyMsP50} ms`);
}

const res = {
  measuredAt: new Date().toISOString(),
  backend: { kind: cfg.kind, label: cfg.label, model: p.model, hardware: cfg.hardware },
  note: cfg.kind === 'amd' ? 'Measured on AMD hardware.' : 'NOT AMD: stand-in or other endpoint. Do not quote as AMD results.',
  samples: cases.length,
  repeats: REPEATS,
  quality: {
    ...quality,
    pctJson: Math.round((quality.jsonOk / quality.runs) * 100),
    pctMedicine: Math.round((quality.medicine / quality.runs) * 100),
    pctSex: Math.round((quality.sex / quality.runs) * 100),
    pctOutcome: Math.round((quality.outcome / quality.runs) * 100),
    pctTriage: Math.round((quality.triage / quality.runs) * 100),
    pctGrounded: quality.filled ? Math.round((quality.grounded / quality.filled) * 100) : null,
    latencyMsP50: pct(latencies, 0.5),
    latencyMsP95: pct(latencies, 0.95),
  },
  load,
};

const stamp = res.measuredAt.replace(/[:.]/g, '-');
const dir = path.join(ROOT, 'bench', 'results');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${stamp}-${cfg.kind}.json`), JSON.stringify(res, null, 2));
const md = [
  `# Benchmark ${res.measuredAt}`,
  '',
  `Backend: **${cfg.kind}** · ${p.model} · ${cfg.hardware || cfg.label || 'unlabelled'}`,
  res.note,
  '',
  `Quality on ${cases.length} fictional samples x ${REPEATS}: JSON ok ${res.quality.pctJson}%, medicine ${res.quality.pctMedicine}%, sex ${res.quality.pctSex}%, outcome ${res.quality.pctOutcome}%, triage ${res.quality.pctTriage}%, quotes found in text ${res.quality.pctGrounded}%.`,
  '',
  '| Concurrency | Reports/s | Tokens/s | p50 ms | p95 ms | Failed |',
  '|---|---|---|---|---|---|',
  ...load.map((l) => `| ${l.concurrency} | ${l.reportsPerSecond} | ${l.completionTokensPerSecond} | ${l.latencyMsP50} | ${l.latencyMsP95} | ${l.failed} |`),
  '',
].join('\n');
fs.writeFileSync(path.join(dir, `${stamp}-${cfg.kind}.md`), md);
console.log('\n' + md);
