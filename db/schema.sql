-- Runway public intake. Apply in Supabase after creating a dedicated project.
-- Anonymous visitors may insert a brief or a talent card. They may not read PII.

create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  contact_name text not null,
  company_name text not null,
  role text not null,
  email text not null,
  whatsapp text,
  headcount int not null,
  project_type text not null,
  working_title text,
  city text,
  location_count int,
  dates_notes text,
  pay_type text,
  needs text[] not null default '{}',
  look_description text not null,
  decision_timeline text,
  preferred_contact text,
  preferred_response_time text,
  source_url text,
  privacy_version text,
  notes text
);

create table if not exists public.talent (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new',
  full_name text not null,
  preferred_name text,
  email text not null,
  whatsapp text,
  city text not null,
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
  union_status text,
  marketing_opt_in boolean not null default false,
  privacy_version text,
  notes text
);

alter table public.briefs enable row level security;
alter table public.talent enable row level security;

-- Replace these with locked-down policies before public traffic.
-- Recommended: inserts only via an Edge Function using the service role,
-- after honeypot / rate-limit checks. Do not grant anon SELECT.
