-- Runway tables on the shared Exchange Line Supabase project.
-- Safe and additive. Does not alter leads, quotes, or profiles.

create table if not exists public.runway_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('talent', 'agency')),
  display_name text,
  company_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.runway_talent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  preferred_name text,
  email text,
  whatsapp text,
  city text,
  age_band text,
  presentation text,
  languages text,
  experience_level text,
  categories text[] not null default '{}',
  height_cm int,
  size_band text,
  tattoos_piercings text,
  has_id text,
  has_transport text,
  availability text,
  portfolio_url text,
  photo_url text,
  union_status text,
  bio text,
  listed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.runway_briefs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  agency_user_id uuid references auth.users(id) on delete set null,
  contact_name text,
  company_name text,
  role text,
  email text,
  whatsapp text,
  headcount int,
  project_type text,
  working_title text,
  city text,
  location_count int,
  dates_notes text,
  pay_type text,
  needs text[] not null default '{}',
  look_description text,
  decision_timeline text,
  preferred_contact text,
  preferred_response_time text
);

create table if not exists public.runway_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  talent_id uuid not null references public.runway_talent(id) on delete cascade,
  agency_user_id uuid not null references auth.users(id) on delete cascade,
  project_title text not null,
  dates_notes text,
  message text,
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'held')),
  agency_name text
);

alter table public.runway_accounts enable row level security;
alter table public.runway_talent enable row level security;
alter table public.runway_briefs enable row level security;
alter table public.runway_bookings enable row level security;

drop policy if exists runway_accounts_self on public.runway_accounts;
create policy runway_accounts_self on public.runway_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists runway_talent_self on public.runway_talent;
create policy runway_talent_self on public.runway_talent
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists runway_talent_listed_read on public.runway_talent;
create policy runway_talent_listed_read on public.runway_talent
  for select to authenticated
  using (listed = true or user_id = auth.uid());

drop policy if exists runway_briefs_insert_any on public.runway_briefs;
create policy runway_briefs_insert_any on public.runway_briefs
  for insert to anon, authenticated
  with check (true);

drop policy if exists runway_briefs_own_read on public.runway_briefs;
create policy runway_briefs_own_read on public.runway_briefs
  for select to authenticated
  using (agency_user_id = auth.uid());

drop policy if exists runway_bookings_agency_write on public.runway_bookings;
create policy runway_bookings_agency_write on public.runway_bookings
  for insert to authenticated
  with check (agency_user_id = auth.uid());

drop policy if exists runway_bookings_read on public.runway_bookings;
create policy runway_bookings_read on public.runway_bookings
  for select to authenticated
  using (
    agency_user_id = auth.uid()
    or talent_id in (select id from public.runway_talent where user_id = auth.uid())
  );

drop policy if exists runway_bookings_talent_update on public.runway_bookings;
create policy runway_bookings_talent_update on public.runway_bookings
  for update to authenticated
  using (talent_id in (select id from public.runway_talent where user_id = auth.uid()))
  with check (talent_id in (select id from public.runway_talent where user_id = auth.uid()));

grant select, insert, update on public.runway_accounts to authenticated;
grant select, insert, update on public.runway_talent to authenticated;
grant insert on public.runway_briefs to anon, authenticated;
grant select on public.runway_briefs to authenticated;
grant select, insert, update on public.runway_bookings to authenticated;

-- Privacy-conscious website activity. Never store form values, email
-- addresses, phone numbers, or free-text submissions in this table.
create table if not exists public.runway_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id uuid not null,
  event_name text not null check (char_length(event_name) between 1 and 80),
  page_path text not null check (char_length(page_path) between 1 and 300),
  target text check (target is null or char_length(target) <= 160),
  referrer text check (referrer is null or char_length(referrer) <= 255),
  screen_resolution text check (screen_resolution is null or char_length(screen_resolution) <= 32),
  browser_language text check (browser_language is null or char_length(browser_language) <= 32),
  duration_seconds int check (duration_seconds is null or duration_seconds between 0 and 86400),
  utm_source text check (utm_source is null or char_length(utm_source) <= 120),
  utm_medium text check (utm_medium is null or char_length(utm_medium) <= 120),
  utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 120),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 4096)
);

create index if not exists runway_events_created_at_idx on public.runway_events (created_at desc);
create index if not exists runway_events_name_created_at_idx on public.runway_events (event_name, created_at desc);
create index if not exists runway_events_session_created_at_idx on public.runway_events (session_id, created_at desc);

alter table public.runway_events enable row level security;

drop policy if exists runway_events_insert on public.runway_events;
create policy runway_events_insert on public.runway_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists runway_events_admin_read on public.runway_events;
create policy runway_events_admin_read on public.runway_events
  for select to authenticated
  using (exists (select 1 from public.sf_site_admins a where a.user_id = (select auth.uid())));

revoke all on public.runway_events from anon, authenticated;
grant usage on sequence public.runway_events_id_seq to anon, authenticated;
grant insert on public.runway_events to anon, authenticated;
grant select on public.runway_events to authenticated;
