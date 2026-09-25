# Runway

Editorial casting agency site for extras, runway models, and on-camera talent.

Public site: lookbook + production brief.
Members: talent profiles and an agency book with hold requests.

Uses the same Supabase project as Exchange Line. Runway data lives in separate `runway_*` tables so phone leads stay untouched.

https://iederees-create.github.io/runway/
https://iederees-create.github.io/runway/members/

## One-time database step

In the Exchange Line Supabase SQL editor, run `db/010_runway.sql`. Until that runs, Members and brief saves will error.

## Accounts

- Talent sign up in Members, edit a card, and tick **List me on the public book**.
- Agencies sign up in Members, filter listed talent, and request a hold.
- Talent accept or decline inside their studio.
