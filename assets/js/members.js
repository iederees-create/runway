import { CONFIG } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

async function client() {
  if (!window.supabase) {
    await new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = ok;
      s.onerror = no;
      document.head.append(s);
    });
  }
  return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
}

const params = new URLSearchParams(location.search);
if (params.get('type') === 'agency') $('#account-type').value = 'agency';
if (params.get('type') === 'talent') $('#account-type').value = 'talent';

$('#pick-talent').addEventListener('click', () => {
  $('#account-type').value = 'talent';
  $('#gate-title').textContent = 'Talent studio';
});
$('#pick-agency').addEventListener('click', () => {
  $('#account-type').value = 'agency';
  $('#gate-title').textContent = 'Agency book';
});

let sb;
let sessionUser;
let holdTalent = null;
let filterCat = '';
let filterCity = '';

function setStatus(id, msg, err) {
  const el = $(id);
  el.textContent = msg;
  el.className = err ? 'form-status error' : 'form-status';
}

async function ensureAccount(type, name) {
  const { data } = await sb.from('runway_accounts').select('user_id,account_type').eq('user_id', sessionUser.id).maybeSingle();
  if (data) return data.account_type;
  const row = {
    user_id: sessionUser.id,
    account_type: type,
    display_name: name || sessionUser.email.split('@')[0],
    company_name: type === 'agency' ? name : null,
  };
  const { error } = await sb.from('runway_accounts').insert(row);
  if (error) throw error;
  return type;
}

async function showApp(type) {
  $('#gate').hidden = true;
  $('#signout').hidden = false;
  $('#who-label').textContent = type === 'agency' ? 'Agency desk' : 'Talent studio';
  if (type === 'agency') {
    $('#agency-app').hidden = false;
    await loadBook();
    await loadAgencyBookings();
  } else {
    $('#talent-app').hidden = false;
    await loadTalentForm();
    await loadTalentBookings();
  }
}

async function boot() {
  sb = await client();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  sessionUser = session.user;
  const { data } = await sb.from('runway_accounts').select('account_type').eq('user_id', sessionUser.id).maybeSingle();
  await showApp(data?.account_type || $('#account-type').value);
}

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('#auth-status', 'Signing in…');
  try {
    sb = await client();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    sessionUser = data.user;
    const type = await ensureAccount($('#account-type').value, $('#display-name').value.trim());
    await showApp(type);
  } catch (err) {
    setStatus('#auth-status', err.message || 'Sign in failed', true);
  }
});

$('#do-signup').addEventListener('click', async () => {
  setStatus('#auth-status', 'Creating account…');
  try {
    sb = await client();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: CONFIG.membersRedirectUrl,
        data: { display_name: $('#display-name').value },
      },
    });
    if (error) throw error;
    if (data.session) {
      sessionUser = data.user;
      const type = await ensureAccount($('#account-type').value, $('#display-name').value.trim());
      await showApp(type);
    } else {
      setStatus('#auth-status', 'Check your email to confirm the account, then sign in.');
    }
  } catch (err) {
    setStatus('#auth-status', err.message || 'Could not create account', true);
  }
});

$('#signout').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.href = './';
});

function catsFromForm() {
  return $$('#talent-profile input[type=checkbox][id^=tc-]:checked').map((i) => i.value);
}

async function loadTalentForm() {
  const { data } = await sb.from('runway_talent').select('*').eq('user_id', sessionUser.id).maybeSingle();
  if (!data) return;
  $('#t-name').value = data.full_name || '';
  $('#t-pref').value = data.preferred_name || '';
  $('#t-city').value = data.city || '';
  $('#t-age').value = data.age_band || '18-24';
  $('#t-pres').value = data.presentation || '';
  $('#t-lang').value = data.languages || '';
  $('#t-exp').value = data.experience_level || 'none';
  $('#t-height').value = data.height_cm || '';
  $('#t-size').value = data.size_band || '';
  $('#t-avail').value = data.availability || 'weekdays';
  $('#t-wa').value = data.whatsapp || '';
  $('#t-photo').value = data.photo_url || '';
  $('#t-port').value = data.portfolio_url || '';
  $('#t-bio').value = data.bio || '';
  $('#t-listed').checked = data.listed;
  $$('#talent-profile input[id^=tc-]').forEach((el) => {
    el.checked = (data.categories || []).includes(el.value);
  });
}

$('#talent-profile').addEventListener('submit', async (e) => {
  e.preventDefault();
  setStatus('#talent-status', 'Saving…');
  const row = {
    user_id: sessionUser.id,
    full_name: $('#t-name').value.trim(),
    preferred_name: $('#t-pref').value.trim(),
    email: sessionUser.email,
    whatsapp: $('#t-wa').value.trim(),
    city: $('#t-city').value.trim(),
    age_band: $('#t-age').value,
    presentation: $('#t-pres').value.trim(),
    languages: $('#t-lang').value.trim(),
    experience_level: $('#t-exp').value,
    categories: catsFromForm(),
    height_cm: Number($('#t-height').value) || null,
    size_band: $('#t-size').value.trim(),
    availability: $('#t-avail').value,
    photo_url: $('#t-photo').value.trim() || null,
    portfolio_url: $('#t-port').value.trim() || null,
    bio: $('#t-bio').value.trim(),
    listed: $('#t-listed').checked,
    updated_at: new Date().toISOString(),
  };
  const { error } = await sb.from('runway_talent').upsert(row, { onConflict: 'user_id' });
  setStatus('#talent-status', error ? `${error.message} — run db/010_runway.sql in Supabase` : 'Card saved.', Boolean(error));
});

async function loadTalentBookings() {
  const { data: me } = await sb.from('runway_talent').select('id').eq('user_id', sessionUser.id).maybeSingle();
  if (!me) {
    $('#talent-bookings').innerHTML = '<p class="notice">Save a card first.</p>';
    return;
  }
  const { data } = await sb.from('runway_bookings').select('*').eq('talent_id', me.id).order('created_at', { ascending: false });
  $('#talent-bookings').innerHTML = (data || []).map((b) => `
    <article class="booking">
      <strong>${escapeHtml(b.project_title)}</strong>
      <p>${escapeHtml(b.agency_name || 'Agency')} · ${escapeHtml(b.dates_notes || '')}</p>
      <p>${escapeHtml(b.message || '')}</p>
      <span class="status-pill ${escapeHtml(b.status)}">${escapeHtml(b.status)}</span>
      <div class="hero-actions" style="margin-top:12px">
        <button class="button small" data-id="${b.id}" data-st="accepted">Accept</button>
        <button class="button ghost small" data-id="${b.id}" data-st="declined">Decline</button>
      </div>
    </article>`).join('') || '<p class="notice">No hold requests yet.</p>';
  $$('#talent-bookings button[data-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('runway_bookings').update({ status: btn.dataset.st }).eq('id', btn.dataset.id);
      await loadTalentBookings();
    });
  });
}

$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-cat]');
  if (!btn) return;
  filterCat = btn.dataset.cat;
  $$('#filters button').forEach((b) => b.classList.toggle('on', b === btn));
  loadBook();
});

$('#city-filter').addEventListener('change', () => {
  filterCity = $('#city-filter').value;
  loadBook();
});

async function loadBook() {
  setStatus('#book-status', 'Loading book…');
  const { data, error } = await sb.from('runway_talent').select('*').eq('listed', true);
  if (error) {
    setStatus('#book-status', `${error.message} — run db/010_runway.sql`, true);
    return;
  }
  const cities = [...new Set((data || []).map((t) => t.city).filter(Boolean))].sort();
  const select = $('#city-filter');
  const current = filterCity;
  select.innerHTML = '<option value="">All cities</option>' + cities.map((c) => `<option>${escapeHtml(c)}</option>`).join('');
  select.value = current;
  const rows = (data || []).filter((t) => {
    const catOk = !filterCat || (t.categories || []).includes(filterCat);
    const cityOk = !filterCity || t.city === filterCity;
    return catOk && cityOk;
  });
  setStatus('#book-status', rows.length ? `${rows.length} listed` : 'No listed talent in this filter yet.');
  $('#book-grid').innerHTML = rows.map((t) => {
    const name = t.preferred_name || t.full_name || 'Talent';
    const photo = t.photo_url ? `style="background-image:url('${escapeHtml(t.photo_url)}')"` : '';
    const chips = (t.categories || []).map((c) => `<span class="chip">${escapeHtml(c)}</span>`).join('');
    return `
      <article class="talent-card">
        <div class="talent-photo" ${photo}>${t.photo_url ? '' : escapeHtml(name.slice(0, 1))}</div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(t.city || '')}${t.height_cm ? ` · ${t.height_cm}cm` : ''}</p>
        <div class="talent-meta">${chips}</div>
        <p>${escapeHtml(t.bio || t.experience_level || '')}</p>
        <button class="button small" data-book="${t.id}" data-name="${escapeHtml(t.full_name || name)}">Request hold</button>
      </article>`;
  }).join('');
  $$('#book-grid [data-book]').forEach((btn) => {
    btn.addEventListener('click', () => openHold(btn.dataset.book, btn.dataset.name));
  });
}

function openHold(id, name) {
  holdTalent = { id, name };
  $('#hold-who').textContent = `Hold for ${name}`;
  $('#hold-title-input').value = '';
  $('#hold-dates').value = '';
  $('#hold-note').value = '';
  $('#hold-status').textContent = '';
  $('#hold-modal').hidden = false;
}

$('#hold-close').addEventListener('click', () => { $('#hold-modal').hidden = true; });
$('#hold-modal').addEventListener('click', (e) => {
  if (e.target === $('#hold-modal')) $('#hold-modal').hidden = true;
});

$('#hold-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!holdTalent) return;
  setStatus('#hold-status', 'Sending…');
  const { data: acc } = await sb.from('runway_accounts').select('company_name,display_name').eq('user_id', sessionUser.id).maybeSingle();
  const { error } = await sb.from('runway_bookings').insert({
    talent_id: holdTalent.id,
    agency_user_id: sessionUser.id,
    project_title: $('#hold-title-input').value.trim(),
    dates_notes: $('#hold-dates').value.trim(),
    message: $('#hold-note').value.trim(),
    agency_name: acc?.company_name || acc?.display_name || sessionUser.email,
  });
  if (error) {
    setStatus('#hold-status', error.message, true);
    return;
  }
  $('#hold-modal').hidden = true;
  await loadAgencyBookings();
});

async function loadAgencyBookings() {
  const { data } = await sb.from('runway_bookings').select('*').eq('agency_user_id', sessionUser.id).order('created_at', { ascending: false });
  $('#agency-bookings').innerHTML = (data || []).map((b) => `
    <article class="booking">
      <strong>${escapeHtml(b.project_title)}</strong>
      <p>${escapeHtml(b.dates_notes || '')}</p>
      <span class="status-pill ${escapeHtml(b.status)}">${escapeHtml(b.status)}</span>
    </article>
  `).join('') || '<p class="notice">No holds requested yet.</p>';
}

boot();
