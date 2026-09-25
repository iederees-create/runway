import { CONFIG } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function escapeHtml(v) {
  return String(v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

const labels = {
  commercial: 'Commercial', series: 'Series', film: 'Film', runway: 'Runway / fitting',
  stills: 'Stills', other: 'Other', paid: 'Paid', spec: 'Spec / usage to confirm',
  tfp: 'TFP', not_sure: 'Not sure', background: 'Background extras',
  principal: 'Principal actor', featured: 'Featured / commercial',
  self_tape: 'Self-tape required', union: 'Union preference',
  own_wardrobe: 'Own wardrobe', researching: 'Just researching',
  month: 'This month', week: 'This week', asap: 'Shooting this week',
  email: 'Email', whatsapp: 'WhatsApp', conversation: 'Requested conversation',
  none: 'None', student: 'Student / training', extras: 'Booked extras',
  some: 'Some can describe', many: 'Many / a feature',
  weekdays: 'Weekdays', nights: 'Nights / weekends', last_minute: 'Last-minute',
  limited: 'Limited', sage: 'SAGE', yes: 'Yes', no: 'No',
};
const human = (v) => labels[v] || v || 'Not provided';

const board = $('#board');
const headcount = $('#headcount');
const jacks = [];
for (let i = 1; i <= 40; i += 1) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'jack';
  b.dataset.n = String(i);
  b.setAttribute('role', 'radio');
  b.setAttribute('aria-checked', 'false');
  b.setAttribute('aria-label', i + (i === 1 ? ' person' : ' people'));
  b.tabIndex = i === 1 ? 0 : -1;
  board.append(b);
  jacks.push(b);
}

function selectHeadcount(value, focus = false) {
  const n = Math.max(1, Math.min(40, Number(value)));
  jacks.forEach((j, i) => {
    j.classList.toggle('connected', i < n);
    j.setAttribute('aria-checked', String(i === n - 1));
    j.tabIndex = i === n - 1 ? 0 : -1;
  });
  $('#board-count').textContent = n + (n === 1 ? ' person selected' : ' people selected');
  $('#selection-summary').textContent = n + (n === 1 ? ' person is needed on set.' : ' people are needed on set.');
  const fit = $('#fit-message');
  fit.hidden = false;
  if (n < 3) fit.textContent = 'Small cast. This brief will be reviewed as principal or featured work.';
  else if (n >= 12) fit.textContent = 'Large extra call. We will confirm holding, wardrobe and call time separately.';
  else fit.textContent = 'This headcount is within the normal brief range.';
  headcount.value = String(n);
  $('#headcount-val').value = String(n);
  if (focus) jacks[n - 1].focus({ preventScroll: true });
}

board.addEventListener('click', (e) => {
  const j = e.target.closest('.jack');
  if (j) selectHeadcount(j.dataset.n);
});
board.addEventListener('keydown', (e) => {
  const j = e.target.closest('.jack');
  if (!j) return;
  let n = Number(j.dataset.n);
  if (['ArrowRight', 'ArrowDown'].includes(e.key)) n += 1;
  else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) n -= 1;
  else if (e.key === 'Home') n = 1;
  else if (e.key === 'End') n = 40;
  else return;
  e.preventDefault();
  selectHeadcount(n, true);
});
headcount.addEventListener('input', () => {
  $('#headcount-val').value = headcount.value;
  selectHeadcount(headcount.value);
});

function checked(name, root) {
  return $$('input[name="' + name + '"]:checked', root).map((i) => i.value);
}

function wizard(opts) {
  const form = $(opts.form);
  const steps = $$('.form-step', form);
  const indicators = $$(opts.steps + ' li');
  let current = 0;
  function show(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, n) => { s.hidden = n !== current; });
    indicators.forEach((el, n) => el.classList.toggle('active', n === current));
    $(opts.prev).hidden = current === 0;
    $(opts.next).hidden = current === steps.length - 1;
    $(opts.submit).hidden = current !== steps.length - 1;
  }
  function valid() {
    for (const field of $$('input,select,textarea', steps[current])) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    if (opts.minChecks && current === opts.minChecks.step) {
      if (checked(opts.minChecks.name, form).length < 1) {
        const status = $(opts.status);
        status.className = 'form-status error';
        status.textContent = opts.minChecks.message;
        return false;
      }
    }
    return true;
  }
  $(opts.next).addEventListener('click', () => {
    if (!valid()) return;
    if (current === 2) opts.renderReview();
    show(current + 1);
  });
  $(opts.prev).addEventListener('click', () => show(current - 1));
  $(opts.edit).addEventListener('click', () => show(0));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid()) return;
    const data = opts.payload();
    const button = $(opts.submit);
    const status = $(opts.status);
    button.disabled = true;
    status.className = 'form-status';
    status.textContent = 'Saving...';
    try {
      if (data.website) throw new Error('Unable to submit');
      await save(opts.kind, data);
      sessionStorage.setItem(opts.storage, JSON.stringify(data));
      status.textContent = '';
      form.hidden = true;
      const done = $(opts.done);
      done.hidden = false;
      opts.renderDone(data);
      done.focus({ preventScroll: true });
    } catch (err) {
      console.error(err);
      status.className = 'form-status error';
      status.textContent = 'Could not save. Use WhatsApp review instead.';
      button.disabled = false;
    }
  });
  show(0);
}

function briefPayload() {
  const d = new FormData($('#brief-form'));
  return {
    kind: 'brief',
    contact_name: String(d.get('contact_name') || '').trim(),
    company_name: String(d.get('company_name') || '').trim(),
    role: String(d.get('role') || '').trim(),
    email: String(d.get('email') || '').trim(),
    whatsapp: String(d.get('whatsapp') || '').trim(),
    headcount: Number(d.get('headcount')),
    project_type: d.get('project_type'),
    working_title: String(d.get('working_title') || '').trim(),
    city: String(d.get('city') || '').trim(),
    location_count: Number(d.get('location_count')),
    dates_notes: String(d.get('dates_notes') || '').trim(),
    pay_type: d.get('pay_type'),
    needs: checked('needs', $('#brief-form')),
    look_description: String(d.get('look_description') || '').trim(),
    decision_timeline: d.get('decision_timeline'),
    preferred_contact: d.get('preferred_contact'),
    preferred_response_time: String(d.get('preferred_response_time') || '').trim(),
    website: d.get('website') || '',
    privacy_version: CONFIG.privacyVersion,
  };
}

function talentPayload() {
  const d = new FormData($('#talent-form'));
  return {
    kind: 'talent',
    full_name: String(d.get('full_name') || '').trim(),
    preferred_name: String(d.get('preferred_name') || '').trim(),
    email: String(d.get('email') || '').trim(),
    whatsapp: String(d.get('whatsapp') || '').trim(),
    city: String(d.get('city') || '').trim(),
    age_band: d.get('age_band'),
    presentation: String(d.get('presentation') || '').trim(),
    languages: String(d.get('languages') || '').trim(),
    experience_level: d.get('experience_level'),
    categories: checked('categories', $('#talent-form')),
    height_cm: d.get('height_cm') || '',
    size_band: String(d.get('size_band') || '').trim(),
    tattoos_piercings: d.get('tattoos_piercings'),
    has_id: d.get('has_id'),
    has_transport: d.get('has_transport'),
    availability: d.get('availability'),
    portfolio_url: String(d.get('portfolio_url') || '').trim(),
    union_status: d.get('union_status'),
    marketing_opt_in: Boolean(d.get('marketing_opt_in')),
    website: d.get('website') || '',
    privacy_version: CONFIG.privacyVersion,
  };
}

function rowsHtml(rows) {
  return rows.map(([k, v]) => '<li><span>' + k + '</span>' + escapeHtml(v) + '</li>').join('');
}

wizard({
  form: '#brief-form', steps: '#brief-steps', prev: '#brief-prev', next: '#brief-next',
  submit: '#brief-submit', edit: '#brief-edit', status: '#brief-status', done: '#brief-done',
  storage: 'runwayLastBrief', kind: 'brief',
  minChecks: { step: 1, name: 'needs', message: 'Choose at least one category, or Not sure.' },
  payload: briefPayload,
  renderReview() {
    const d = briefPayload();
    $('#brief-review').innerHTML = rowsHtml([
      ['Contact', d.contact_name + ', ' + d.role + ' at ' + d.company_name],
      ['Project', human(d.project_type) + ' - ' + d.working_title],
      ['Where / when', d.city + ', ' + d.dates_notes],
      ['Headcount', String(d.headcount) + ' across ' + String(d.location_count) + ' location(s)'],
      ['Engagement', human(d.pay_type)],
      ['Need', d.needs.map(human).join(', ') || 'None'],
      ['Look', d.look_description],
      ['Timeline', human(d.decision_timeline)],
    ]);
  },
  renderDone(d) {
    $('#brief-summary').innerHTML = rowsHtml([
      ['Project', human(d.project_type) + ' - ' + d.working_title],
      ['People', String(d.headcount)],
      ['Need', d.needs.map(human).join(', ') || 'To confirm'],
      ['Look', d.look_description],
    ]);
    const risks = [];
    if (d.pay_type !== 'paid') risks.push('Engagement type is not a confirmed paid booking.');
    if (d.decision_timeline === 'asap') risks.push('Dates are tight. Availability must be checked immediately.');
    if (d.headcount >= 12) risks.push('Large call. Holding, wardrobe and extras wrangling need confirmation.');
    if (!d.look_description || d.look_description.length < 40) risks.push('Look is thin. We will ask for references.');
    $('#brief-risks').innerHTML = (risks.length ? risks : ['Dates, look and usage still need confirmation.']).map((r) => '<li>' + escapeHtml(r) + '</li>').join('');
  },
});

wizard({
  form: '#talent-form', steps: '#talent-steps', prev: '#talent-prev', next: '#talent-next',
  submit: '#talent-submit', edit: '#talent-edit', status: '#talent-status', done: '#talent-done',
  storage: 'runwayLastTalent', kind: 'talent',
  minChecks: { step: 0, name: 'categories', message: 'Choose at least one category you book for.' },
  payload: talentPayload,
  renderReview() {
    const d = talentPayload();
    $('#talent-review').innerHTML = rowsHtml([
      ['Name', d.preferred_name ? d.full_name + ' (' + d.preferred_name + ')' : d.full_name],
      ['City', d.city],
      ['Books for', d.categories.map(human).join(', ')],
      ['Age / presentation', d.age_band + ', ' + d.presentation],
      ['Experience', human(d.experience_level)],
      ['Availability', human(d.availability)],
      ['Portfolio', d.portfolio_url || 'Will send photos'],
    ]);
  },
  renderDone(d) {
    $('#talent-summary').innerHTML = rowsHtml([
      ['Name', d.full_name], ['City', d.city],
      ['Books for', d.categories.map(human).join(', ')],
      ['Experience', human(d.experience_level)],
    ]);
  },
});

async function save(kind, data) {
  if (CONFIG.submissionMode === 'edge-function' && CONFIG.edgeFunctionUrl) {
    const r = await fetch(CONFIG.edgeFunctionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(result.error || 'Unable to save');
    return result;
  }
  const key = kind === 'brief' ? 'runwayBriefs' : 'runwayTalent';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(Object.assign({}, data, { saved_at: new Date().toISOString() }));
  localStorage.setItem(key, JSON.stringify(existing));
  return { ok: true };
}

function briefMessage(d) {
  return [
    'Runway casting brief',
    'Contact: ' + (d.contact_name || '') + ' (' + (d.role || '') + ')',
    'Company: ' + (d.company_name || ''),
    'Email: ' + (d.email || ''),
    'Project: ' + human(d.project_type) + ' - ' + (d.working_title || ''),
    'City / dates: ' + (d.city || '') + ' / ' + (d.dates_notes || ''),
    'Headcount: ' + d.headcount,
    'Engagement: ' + human(d.pay_type),
    'Need: ' + (d.needs || []).map(human).join(', '),
    'Look: ' + (d.look_description || ''),
    'Timeline: ' + human(d.decision_timeline),
    '',
    'Please confirm the brief before sending a shortlist.',
  ].join('\n');
}

function talentMessage(d) {
  return [
    'Runway talent card',
    'Name: ' + (d.full_name || ''),
    'City: ' + (d.city || ''),
    'Books for: ' + (d.categories || []).map(human).join(', '),
    'Age band: ' + (d.age_band || ''),
    'Experience: ' + human(d.experience_level),
    'WhatsApp: ' + (d.whatsapp || ''),
    'Portfolio: ' + (d.portfolio_url || 'Photos to follow'),
    '',
    'Please add me to the Runway book. This is not a request for a specific job.',
  ].join('\n');
}

const backdrop = $('#wa-backdrop');
const dialog = $('#wa-dialog');
let returnFocus;
let prepared = '';

function last(key, fallback) {
  try { return JSON.parse(sessionStorage.getItem(key)) || fallback(); } catch (e) { return fallback(); }
}

function openWa(trigger, text) {
  returnFocus = trigger;
  prepared = text;
  $('#wa-preview').textContent = prepared;
  backdrop.hidden = false;
  document.body.classList.add('dialog-open');
  dialog.focus();
}

function closeWa() {
  backdrop.hidden = true;
  document.body.classList.remove('dialog-open');
  if (returnFocus) returnFocus.focus();
  returnFocus = null;
}

$('#open-whatsapp').addEventListener('click', (e) => {
  const brief = last('runwayLastBrief', function () { return null; });
  const talent = last('runwayLastTalent', function () { return null; });
  const text = brief ? briefMessage(brief) : talent ? talentMessage(talent) : 'Hi Runway. I would like to talk about a brief or joining the book.';
  openWa(e.currentTarget, text);
});
$('#brief-wa-btn').addEventListener('click', (e) => openWa(e.currentTarget, briefMessage(last('runwayLastBrief', briefPayload))));
$('#talent-wa-btn').addEventListener('click', (e) => openWa(e.currentTarget, talentMessage(last('runwayLastTalent', talentPayload))));
$('#close-whatsapp').addEventListener('click', closeWa);
$('#cancel-whatsapp').addEventListener('click', closeWa);
backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) closeWa(); });
$('#continue-whatsapp').addEventListener('click', () => {
  const n = CONFIG.whatsAppRecipient;
  if (!n) {
    window.alert('Add your WhatsApp number in assets/js/config.js (whatsAppRecipient).');
    return;
  }
  window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(prepared), '_blank', 'noopener');
});
document.addEventListener('keydown', (e) => {
  if (backdrop.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeWa(); }
});
