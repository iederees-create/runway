# Runway

Casting intake for **Runway** — background actors, runway models, and talent for series, film and commercials.

Same operating model as Exchange Line: the public site collects requirements in plain language. It does not publish rates, guarantee bookings, or let productions browse the full book. Runway confirms the brief, then shortlists.

Live homepage (enable GitHub Pages on `main` / root):

https://iederees-create.github.io/runway/

## Public journeys

- **Casting / production** — describe the job, headcount, dates and look. Submit a brief.
- **Talent** — join the book (18+ only). Selection is not guaranteed.

Both paths: Team-style stepper → review → save → optional WhatsApp preview before send.

## What's here

- `index.html` — landing page and both intake forms
- `assets/` — CSS and front-end logic
- `privacy/` — POPIA-oriented notice
- `db/schema.sql` — `briefs` and `talent` tables with RLS notes

## Public quote / rate policy

The public site does not expose day rates, agency fees or calculated estimates. Productions describe the shoot. Talent describe themselves. Runway confirms fit privately.

## Stack

Dependency-free HTML/CSS/JavaScript. Optional Supabase later (`assets/js/config.js`). Until keys are set, submissions stay on-device and can still open a reviewed WhatsApp message.

## Configure

Edit `assets/js/config.js`:

- `whatsAppRecipient` — international number, no `+` (example: `27…`)
- `supabaseUrl` / `supabaseAnonKey` / `edgeFunctionUrl` when the database is ready
- `submissionMode`: `local` (default) or `edge-function`
