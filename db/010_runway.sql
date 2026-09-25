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
