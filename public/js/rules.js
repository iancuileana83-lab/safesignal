// SafeSignal rules engine. Pure functions, no I/O, no model calls.
// Used unchanged by the browser, the server, the tests and the benchmark,
// so the completeness check and the triage are always transparent and identical.

export const SERIOUSNESS = [
  'death',
  'life_threatening',
  'hospitalisation',
  'disability',
  'congenital_anomaly',
  'other_medically_important',
];

export const SERIOUSNESS_LABEL = {
  death: 'Death',
  life_threatening: 'Life-threatening',
  hospitalisation: 'Hospitalisation',
  disability: 'Lasting disability',
  congenital_anomaly: 'Congenital anomaly',
  other_medically_important: 'Other medically important',
};

export const ENUMS = {
  patient_sex: ['female', 'male', 'other', 'unknown'],
  pregnancy: ['yes', 'no', 'unknown'],
  action_taken: ['stopped', 'dose reduced', 'continued', 'unknown'],
  outcome: ['recovered', 'recovering', 'not recovered', 'fatal', 'unknown'],
  reporter_role: ['patient', 'family member', 'pharmacist', 'pharmacy staff', 'doctor', 'nurse', 'other', 'unknown'],
};

// group -> section shown in the form
export const FIELD_DEFS = [
  { key: 'patient_age', group: 'Patient', label: 'Age', hint: 'e.g. 34 years, 18 months' },
  { key: 'patient_sex', group: 'Patient', label: 'Sex', enum: 'patient_sex' },
  { key: 'pregnancy', group: 'Patient', label: 'Pregnant', enum: 'pregnancy' },
  { key: 'patient_ref', group: 'Patient', label: 'Initials or reference', hint: 'initials or an internal code, never a full name' },
  { key: 'medicine_name', group: 'Suspect medicine', label: 'Medicine', hint: 'brand or generic name' },
  { key: 'medicine_dose', group: 'Suspect medicine', label: 'Dose and frequency', hint: 'e.g. 500 mg three times a day' },
  { key: 'medicine_indication', group: 'Suspect medicine', label: 'Taken for', hint: 'the reason for taking it' },
  { key: 'medicine_start', group: 'Suspect medicine', label: 'Started on', hint: 'date or how long ago' },
  { key: 'medicine_stop', group: 'Suspect medicine', label: 'Stopped on', hint: 'date, or "still taking"' },
  { key: 'other_medicines', group: 'Suspect medicine', label: 'Other medicines', hint: 'anything else taken at the same time' },
  { key: 'reaction_description', group: 'Reaction', label: 'What happened', hint: 'the reaction in the reporter\'s words' },
  { key: 'reaction_onset', group: 'Reaction', label: 'Started on', hint: 'date, or how long after the medicine' },
  { key: 'action_taken', group: 'Reaction', label: 'Action taken', enum: 'action_taken' },
  { key: 'outcome', group: 'Outcome', label: 'Outcome so far', enum: 'outcome' },
  { key: 'seriousness', group: 'Outcome', label: 'Seriousness', list: SERIOUSNESS },
  { key: 'reporter_role', group: 'Reporter', label: 'Reporter is', enum: 'reporter_role' },
];

export const FIELD_KEYS = FIELD_DEFS.map((d) => d.key);

export function emptyFields() {
  const f = {};
  for (const d of FIELD_DEFS) f[d.key] = d.list ? { value: [], quote: '' } : { value: '', quote: '' };
  return f;
}

/** Plain string value of a field, '' when empty or 'unknown'. */
export function val(fields, key) {
  const f = fields && fields[key];
  if (!f) return '';
  const v = Array.isArray(f.value) ? '' : String(f.value ?? '').trim();
  return v.toLowerCase() === 'unknown' ? '' : v;
}

export function serious(fields) {
  const f = fields && fields.seriousness;
  return f && Array.isArray(f.value) ? f.value.filter((s) => SERIOUSNESS.includes(s)) : [];
}

// ---- Completeness -------------------------------------------------------

// The four minimum criteria for a valid case report (patient, reporter,
// suspect medicine, reaction) plus the other key items the user asked for.
const KEY_ITEMS = [
  { id: 'patient', label: 'Patient', test: (f) => !!(val(f, 'patient_age') || val(f, 'patient_sex') || val(f, 'patient_ref')),
    question: 'Who had the reaction? Please give at least an age or age group and the sex (no full names).' },
  { id: 'medicine_name', label: 'Suspect medicine', test: (f) => !!val(f, 'medicine_name'),
    question: 'Which medicine do you suspect caused it (name as on the box)?' },
  { id: 'medicine_dose', label: 'Dose', test: (f) => !!val(f, 'medicine_dose'),
    question: 'What dose was taken and how often?' },
  { id: 'medicine_start', label: 'Medicine start date', test: (f) => !!val(f, 'medicine_start'),
    question: 'When was the medicine started (date or how long ago)?' },
  { id: 'reaction_description', label: 'Reaction', test: (f) => !!val(f, 'reaction_description'),
    question: 'What exactly happened? Describe the symptoms.' },
  { id: 'reaction_onset', label: 'Reaction start date', test: (f) => !!val(f, 'reaction_onset'),
    question: 'When did the reaction start, and how long after the medicine?' },
  { id: 'outcome', label: 'Outcome', test: (f) => !!val(f, 'outcome'),
    question: 'How is the person now: recovered, getting better, not recovered?' },
  { id: 'action_taken', label: 'Action taken', test: (f) => !!val(f, 'action_taken'),
    question: 'Was the medicine stopped, reduced or continued?' },
  { id: 'reporter_role', label: 'Reporter', test: (f) => !!val(f, 'reporter_role'),
    question: 'Who is reporting: the patient, a family member, or a health professional?' },
];

// A report is a valid minimum case when these four are present.
const MINIMUM = ['patient', 'medicine_name', 'reaction_description', 'reporter_role'];

export function completeness(fields) {
  const items = KEY_ITEMS.map((i) => ({ id: i.id, label: i.label, present: !!i.test(fields), question: i.question }));
  const present = items.filter((i) => i.present).length;
  const missing = items.filter((i) => !i.present);
  const minimumMet = MINIMUM.every((id) => items.find((i) => i.id === id).present);
  return {
    items,
    present,
    total: items.length,
    percent: Math.round((present / items.length) * 100),
    missing,
    minimumMet,
    minimumMissing: MINIMUM.filter((id) => !items.find((i) => i.id === id).present),
  };
}

// ---- Triage -------------------------------------------------------------

// Each rule has a visible id so a reviewer can see exactly why a level was set.
const EMERGENCY_RULES = [
  { id: 'E1', text: 'Possible severe allergic reaction (anaphylaxis)', re: /anaphyla/i },
  { id: 'E2', text: 'Breathing difficulty', re: /difficult\w*\s+(in\s+)?breath|trouble\s+breath|(can'?t|cannot|can\s+not|couldn'?t|could\s+not|unable\s+to)\s+breathe|short(ness)?\s+of\s+breath|wheez|struggl\w+\s+to\s+breathe|breathless|gasping/i },
  { id: 'E3', text: 'Swelling of the face, lips, tongue or throat', re: /swell\w*[^.]{0,40}\b(face|lips?|tongue|throat|mouth|eyelids?)\b|\b(face|lips?|tongue|throat|mouth|eyelids?)\b[^.]{0,30}\bswell/i },
  { id: 'E4', text: 'Chest pain or tightness', re: /chest\s+(pain|tightness|pressure)|tight\w*\s+(in|across)\s+(the\s+)?chest/i },
  { id: 'E5', text: 'Seizure or loss of consciousness', re: /seizure|convuls|unconscious|passed\s+out|fainted|collapsed|unresponsive|lost\s+consciousness|blacked\s+out/i },
  { id: 'E6', text: 'Severe or unusual bleeding', re: /(severe|heavy|uncontrolled|profuse)\s+bleeding|vomit\w*\s+(up\s+)?blood|blood\s+in\s+(the\s+)?(stool|vomit|urine)|black\s+(tarry\s+)?stools?|cough\w*\s+(up\s+)?blood/i },
  { id: 'E7', text: 'Thoughts of self-harm or suicide', re: /suicid|self[- ]harm|want(s|ed)?\s+to\s+(die|kill)|end\s+(my|his|her|their)\s+life/i },
];

const PRIORITY_TEXT_RULES = [
  { id: 'P1', text: 'Possible severe skin or mucosal reaction (blistering, peeling, mouth sores)', re: /blister|peeling\s+skin|skin\s+(is\s+|was\s+)?peeling|mouth\s+sores|stevens|widespread\s+rash/i },
  { id: 'P2', text: 'Yellow skin or eyes (possible liver problem)', re: /jaundice|yellow(ing|ed)?\s+(of\s+)?(the\s+)?(skin|eyes)/i },
  { id: 'P3', text: 'Hospital care mentioned', re: /hospitali[sz]|admitted|emergency\s+(department|room)|\ba\s*&\s*e\b|intensive\s+care|\bicu\b|ambulance/i },
  { id: 'P4', text: 'Death mentioned', re: /\bdied\b|\bdeath\b|passed\s+away|\bfatal/i },
];

function parseAgeYears(text) {
  const m = /(\d+(?:[.,]\d+)?)\s*(years?|yrs?|y|months?|mos?|weeks?|wks?|days?)\b/i.exec(text || '');
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toLowerCase();
  if (u.startsWith('y')) return n;
  if (u.startsWith('m')) return n / 12;
  if (u.startsWith('w')) return n / 52;
  if (u.startsWith('d')) return n / 365;
  return null;
}

/**
 * Transparent triage. Order of precedence: emergency > priority > routine.
 * It never diagnoses; it only says how fast a human should look at the report.
 */
export function triage(fields, narrative = '') {
  const reasons = [];
  const textParts = [narrative, val(fields, 'reaction_description'), val(fields, 'outcome')];
  const text = textParts.filter(Boolean).join(' . ');

  for (const r of EMERGENCY_RULES) {
    if (r.re.test(text)) reasons.push({ id: r.id, level: 'emergency', text: r.text });
  }
  const sers = serious(fields);
  if (sers.length) {
    reasons.push({ id: 'S1', level: 'priority', text: 'Marked serious: ' + sers.map((s) => SERIOUSNESS_LABEL[s]).join(', ') });
  }
  if (val(fields, 'outcome') === 'fatal') {
    reasons.push({ id: 'S2', level: 'priority', text: 'Outcome recorded as fatal' });
  }
  for (const r of PRIORITY_TEXT_RULES) {
    if (r.re.test(text)) reasons.push({ id: r.id, level: 'priority', text: r.text });
  }
  const age = parseAgeYears(val(fields, 'patient_age'));
  if (age !== null && age < 2) {
    reasons.push({ id: 'V1', level: 'priority', text: 'Patient is under 2 years old' });
  }
  if (val(fields, 'pregnancy') === 'yes') {
    reasons.push({ id: 'V2', level: 'priority', text: 'Patient is pregnant' });
  }
  if (val(fields, 'outcome') === 'not recovered') {
    reasons.push({ id: 'O1', level: 'priority', text: 'Patient has not recovered yet' });
  }

  let level = 'routine';
  if (reasons.some((r) => r.level === 'priority')) level = 'priority';
  if (reasons.some((r) => r.level === 'emergency')) level = 'emergency';
  if (!reasons.length) {
    reasons.push({ id: 'R0', level: 'routine', text: 'No red-flag wording and no seriousness criterion found' });
  }

  const messages = {
    emergency:
      'Red-flag wording found. If the person is unwell now, call the local emergency number or a doctor immediately. This tool cannot assess a patient.',
    priority: 'Serious or higher-risk features found. A qualified person should review this report soon.',
    routine: 'No urgent features found by these rules. A qualified person still reviews the report before it is sent.',
  };
  const labels = { emergency: 'Emergency wording', priority: 'Priority review', routine: 'Routine' };
  return { level, label: labels[level], message: messages[level], reasons };
}

// ---- Report -------------------------------------------------------------

export const DISCLAIMER =
  'Demo only. Fictional data. Not medical advice. This draft was prepared by software and has not been sent anywhere. A human must review it before any submission.';

export function assess(fields, narrative = '') {
  return { completeness: completeness(fields), triage: triage(fields, narrative) };
}

/** Structured draft report. Nothing is sent; status says who has reviewed it. */
export function buildReport(fields, narrative, meta = {}, reviewed = false) {
  const a = assess(fields, narrative);
  const g = (k) => val(fields, k) || null;
  return {
    schema: 'safesignal.draft-report.v1',
    status: reviewed ? 'REVIEWED_BY_HUMAN_NOT_SENT' : 'DRAFT_NEEDS_HUMAN_REVIEW',
    generatedAt: meta.generatedAt || new Date().toISOString(),
    disclaimer: DISCLAIMER,
    patient: {
      age: g('patient_age'),
      sex: g('patient_sex'),
      pregnant: g('pregnancy'),
      reference: g('patient_ref'),
    },
    suspectMedicine: {
      name: g('medicine_name'),
      dose: g('medicine_dose'),
      indication: g('medicine_indication'),
      startedOn: g('medicine_start'),
      stoppedOn: g('medicine_stop'),
      otherMedicines: g('other_medicines'),
    },
    reaction: {
      description: g('reaction_description'),
      onset: g('reaction_onset'),
      actionTaken: g('action_taken'),
    },
    outcome: g('outcome'),
    seriousness: serious(fields),
    reporter: { role: g('reporter_role') },
    triage: { level: a.triage.level, reasons: a.triage.reasons.map((r) => ({ id: r.id, text: r.text })) },
    completeness: {
      percent: a.completeness.percent,
      minimumMet: a.completeness.minimumMet,
      missing: a.completeness.missing.map((m) => m.label),
    },
    narrative,
    provenance: {
      extraction: meta.extraction || 'manual entry',
      model: meta.model || null,
      backend: meta.backend || null,
    },
  };
}
