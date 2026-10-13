# Submission checklist (AMD Developer Hackathon: ACT III, lablab.ai)

Source: https://lablab.ai/ai-hackathons/amd-developer-hackathon-act-iii (read 2026-10-13).
Rule book: https://lablab.ai/hackathon-rules · Guidelines: https://lablab.ai/ai-articles/hackathon-guidelines

Schedule on the page: online build 12-18 October 2026, on-site 17-18 October (by approval).
The page gives **no deadline time of day**. Your note says 18 Oct 18:00 Romania time: confirm it on the event
dashboard or in Discord, and submit well before it.

## Must submit
- [ ] Project title: **SafeSignal**
- [ ] Short description (drafted below)
- [ ] Long description (drafted below)
- [ ] Challenge/track: **Track 2, Health and Wellbeing**
- [ ] Technology and category tags (AMD Developer Cloud, ROCm, vLLM, Instinct MI300X, open model, agents, healthcare)
- [ ] Cover image
- [ ] Demo video (check the length limit in the rule book; plan under 3 minutes)
- [ ] Slide presentation
- [ ] Public GitHub repository, **MIT licence**, original work
- [ ] Demo application platform and application URL (working prototype)

## Hard requirements
- A meaningful part of the workload runs on AMD hardware, and it is part of the working product shown to judges.
  AMD is required to be eligible for prizes.
- Submissions must be original and MIT-compliant.
- Join the AMD AI Developer Program (needed for approval and credits).
- Google prize: the page only says "Google and Evolus technologies are optional" and "$5,000 in prizes from
  Google". It does not mention Gemma and gives no criteria. Plan: serve Gemma on AMD (open, runs on vLLM),
  tag it, and ask in Discord or the rule book whether that qualifies. Do not claim eligibility until confirmed.

## Judging (as listed)
Application of technology, presentation, business value, originality.

## Draft texts

**Short description**
SafeSignal helps people and pharmacy staff report a suspected medicine side effect completely: an open model on
AMD Instinct extracts the facts, simple transparent rules flag what is missing and how urgent it looks, and a
person reviews the structured draft. Demo only, fictional data.

**Long description**
Incomplete side-effect reports are common and slow to act on: the medicine, dose, dates or outcome are missing,
and the reporter has to be asked again. SafeSignal sits at the moment of reporting. A person describes what
happened in their own words. An open model served with vLLM on an AMD Instinct MI300X extracts patient,
suspect medicine, reaction, dates and outcome, and must quote the words behind every field. Plain rules, not the
model, then check completeness against the minimum of a valid report (patient, reporter, medicine, reaction)
and triage urgency, showing a rule id for each reason, so a prompt injected into a report cannot lower the
urgency. The person edits any field, ticks that they reviewed the draft, and downloads a structured report.
Nothing is sent anywhere. The page always states what answers: live on AMD, a development stand-in, or a clearly
labelled replay of a recorded real AMD run when the GPU is off. Measured latency and throughput are reported.
Built by a freelance medical writer with twenty years in community pharmacies. Demo only; not medical advice.

## Video outline (about 2:30)
1. 0:00 Problem in one sentence (incomplete reports, repeated questions).
2. 0:15 Choose a sample, show extraction with quotes and the "Live on AMD" badge.
3. 0:50 Missing items and questions; edit a field.
4. 1:10 The red-flag sample: emergency wording with rule ids; the injection sample stays emergency.
5. 1:40 Review box, download, "no send button on purpose".
6. 1:55 AMD: MI300X, vLLM, measured numbers from bench (real values only).
7. 2:20 Limits and safety, who built it.
