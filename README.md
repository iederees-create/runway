# Runway

Casting house site for extras, runway models, and on-camera talent.

The public site is a lookbook and production call sheet. Members is two-sided:

- Talent create and list a card (measurements, city, categories, headshot URL).
- Agencies filter the book and request a hold. Talent accept or decline.

Uses the same Supabase project as Exchange Line. Runway data lives in separate `runway_*` tables so phone leads stay untouched.

- https://iederees-create.github.io/runway/
- https://iederees-create.github.io/runway/members/

## One-time database step

In the Exchange Line Supabase SQL editor, run `db/010_runway.sql`. Until that runs, Members and brief saves will error.

## Accounts

1. Talent sign up in Members, save a card, tick **List me on the book**.
2. Agencies sign up in Members, filter listed talent, request a hold.
3. Talent accept or decline inside the studio.
