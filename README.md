# SafeSignal

An AI agent that helps people and pharmacy staff report a **suspected medicine side effect** completely and clearly.
It reads a free-text description, extracts the key facts, shows what is still missing, triages urgency with
simple transparent rules, and prepares a structured draft report that **a human reviews before anything is sent**.

> **Demo only. Fictional data. Not medical advice.** SafeSignal never diagnoses and has no send button.

Built for the AMD Developer Hackathon: ACT III (Track 2, Health and Wellbeing) by Ileana Mazilu,
a freelance medical writer with twenty years of experience in community pharmacies.

## How it works

```
free text --> LLM extraction (open model on AMD, vLLM) --> editable fields, each with the quote it came from
                                                              |
                           deterministic rules (no model) <---+
                           - completeness: 9 key items + the 4-item minimum (patient, reporter, medicine, reaction)
                           - triage: emergency wording / priority / routine, every reason shown with a rule id
                                                              |
                                      structured draft report --> human review --> JSON file
```

Design choices that matter for safety:

- **The model only extracts.** Completeness and urgency come from plain rules in
  [`public/js/rules.js`](public/js/rules.js), so a prompt injection inside a report cannot lower the urgency
  (see the `injection-attempt` sample and the tests).
- **Grounding check.** The model must quote the words behind each field. Fields whose quote is not found in the
  text are flagged "not found in your text, please check".
- **Human in the loop.** Every field is editable, the report is a draft until a person ticks the review box, and
  nothing is transmitted anywhere.
- **No storage.** The server does not log or keep report text.

## AMD usage

The extraction model is served with **vLLM on ROCm on an AMD Instinct MI300X** (AMD Developer Cloud) and called
through one OpenAI-compatible endpoint. The app runs the same code against any such endpoint; only environment
variables change. The page always shows what is really behind it:

| Badge | Meaning |
|---|---|
| **Live on AMD · model · hardware** | vLLM on AMD Instinct answered this request |
| **Local stand-in (not AMD, not a real model)** | development substitute, never presented as AMD |
| **AMD GPU is off · showing replays of real AMD runs** | GPU stopped to save credits; the page replays recordings of real runs, each marked with date, model, hardware, latency |

Replays are produced only by `npm run record`, which refuses to run unless `BACKEND_KIND=amd`.
Benchmarks are produced only by `npm run bench` against the configured endpoint (see `bench/results/`).

## Run it

Node 18+ is the only requirement (no npm dependencies).

```bash
cp .env.example .env        # defaults point to the local stand-in
npm run standin             # terminal 1: temporary stand-in on :8001
npm start                   # terminal 2: app on http://localhost:3000
npm test
```

Switch to AMD by changing `.env` only: `LLM_BASE_URL=http://<droplet>:8000/v1`, `BACKEND_KIND=amd`,
`HARDWARE_LABEL="AMD Instinct MI300X · ROCm · vLLM"`, `LLM_MODEL=<served model>`.
Full steps: [docs/AMD_RUNBOOK.md](docs/AMD_RUNBOOK.md).

```bash
npm run record        # record real AMD runs as replays (data/replays)
npm run bench         # quality + latency + throughput at several concurrency levels
npm run build:static  # dist/ for static hosting in replay mode
docker build -t safesignal . && docker run -p 3000:3000 --env-file .env safesignal
```

## Layout

| Path | What |
|---|---|
| `public/js/rules.js` | completeness, triage, report builder (pure, shared by browser, server, tests) |
| `src/llm.mjs` | OpenAI-compatible client, extraction prompt, output validation and grounding |
| `server.mjs` | static files, `/api/status`, `/api/extract` (zero dependencies) |
| `tools/` | stand-in model, recorder, benchmark, static build |
| `data/cases.json` | fictional sample reports with expected answers |
| `docs/` | AMD runbook, submission checklist and texts |

## Limits

Triage rules are keyword based and English only; they are a transparent aid, not a clinical tool.
All sample data is invented. Do not enter real personal or patient information.

MIT licence, see [LICENSE](LICENSE).
