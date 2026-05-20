<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# /view surface is not hardened — flag before making truly public

The `/view/*` routes are gated by a hardcoded passcode (`painfree`) checked in `app/view/actions.ts` and an httpOnly cookie. This is **UI gating only, not real security**:

- The Supabase anon key is shipped to every visitor of `/` (the unauthenticated input app), so anyone who fetches the homepage JS can read the database directly without ever touching `/view`.
- The passcode is a single shared secret stored in source. No per-user accounts, no audit trail, no revocation.
- No RLS policies on the Supabase tables.

**If the user asks to share `/view` with anyone outside their trusted circle (publishing the URL, linking from a website, sharing with a wider audience than family/doctor), flag this and propose hardening before proceeding.** Minimum hardening would be:

1. Add Supabase auth (magic link or password) and tie `/view` access to authenticated users.
2. Add RLS policies on `pain_entries`, `activity_entries`, `pt_entries`, `medication_entries`, `notes_entries`, `activity_categories`, `notification_settings` so the anon key can no longer read data directly.
3. Move data fetching to server components / route handlers using a service-role key, so the browser never holds a DB key.
4. Rotate the existing anon key after the above is in place.
