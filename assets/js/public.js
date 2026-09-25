import { CONFIG } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const escapeHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const headcount = $('#headcount');
if (headcount) {
  headcount.addEventListener('input', () => { $('#headcount-val').textContent = headcount.value; });
}

function checked(name) {
  return $$(`input[name="${name}"]:checked`).map((i) => i.value);
}

async function client() {
  if (!window.supabase) {
    await new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = ok; s.onerror = no; document.head.append(s);
    });
  }
  return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}

const form = $('#brief-form');
if (!form) throw new Error('brief form missing');
const steps = $$('.form-step', form);
const indicators = $$('#brief-steps li');
let current = 0;

function show(i) {
  current = Math.max(0, Math.min(steps.length - 1, i));
  steps.forEach((s, n) => { s.hidden = n !== current; });
  indicators.forEach((el, n) => el.classList.toggle('active', n === current));
  $('#brief-prev').hidden = current === 0;
  $('#brief-next').hidden = current === steps.length - 1;
  $('#brief-submit').hidden = current !== steps.length - 1;
}

function valid() {
  for (const field of $$('input,select,textarea', steps[current])) {
    if (!field.checkValidity()) { field.reportValidity(); return false; }
  }
  if (current === 1 && checked('needs').length < 1) {
    $('#brief-status').textContent = 'Choose at least one category.';
    $('#brief-status').className = 'form-status error';
    return false;
  }
  return true;
}

function payload() {
  const d = new FormData(form);
  return {
    contact_name: String(d.get('contact_name') || '').trim(),
    company_name: String(d.get('company_name') || '').trim(),
    role: String(d.get('role') || '').trim(),
    email: String(d.get('email') || '').trim(),
    whatsapp: String(d.get('whatsapp') || '').trim() || null,
    headcount: Number(d.get('headcount')),
    project_type: d.get('project_type'),
    working_title: String(d.get('working_title') || '').trim(),
    city: String(d.get('city') || '').trim(),
    dates_notes: String(d.get('dates_notes') || '').trim(),
    pay_type: d.get('pay_type'),
    needs: checked('needs'),
    look_description: String(d.get('look_description') || '').trim(),
    decision_timeline: d.get('decision_timeline'),
    website: d.get('website') || '',
  };
}

function renderReview() {
  const d = payload();
  $('#brief-review').innerHTML = [
    ['Production', `${d.contact_name} · ${d.company_name}`],
    ['Job', `${d.project_type} — ${d.working_title}`],
    ['Where', `${d.city} · ${d.dates_notes}`],
    ['People', String(d.headcount)],
    ['Need', d.needs.join(', ')],
    ['Look', d.look_description],
  ].map(([k, v]) => `<li><span>${k}</span>${escapeHtml(v)}</li>`).join('');
}

$('#brief-next').addEventListener('click', () => {
  if (!valid()) return;
  if (current === 2) renderReview();
  show(current + 1);
});
$('#brief-prev').addEventListener('click', () => show(current - 1));
$('#brief-edit').addEventListener('click', () => show(0));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!valid()) return;
  const d = payload();
  const status = $('#brief-status');
  const button = $('#brief-submit');
  button.disabled = true;
  status.textContent = 'Sending…';
  status.className = 'form-status';
  try {
    if (d.website) throw new Error('blocked');
    const sb = await client();
    const row = { ...d };
    delete row.website;
    const { error } = await sb.from('runway_briefs').insert(row);
    if (error) throw error;
    form.hidden = true;
    $('#brief-done').hidden = false;
    $('#brief-summary').innerHTML = `<li><span>Title</span>${escapeHtml(d.working_title)}</li><li><span>City</span>${escapeHtml(d.city)}</li>`;
    status.textContent = '';
  } catch (err) {
    console.error(err);
    status.className = 'form-status error';
    status.textContent = 'Could not save yet. Run db/010_runway.sql in Supabase, then retry. You can still use Members.';
    button.disabled = false;
  }
});
show(0);
