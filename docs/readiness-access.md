# Access and provider readiness

This source review covers the PaperStreet code on main at `354e77f`. The local
test suite is a regression check. Hosted authentication settings require
separate evidence.

| Check | Finding |
| --- | --- |
| Private pages and records | The [platform layout](<../src/app/(platform)/layout.tsx>) redirects signed-out visitors to login. The [database policy assertions](../supabase/migrations/20261104210000_assert_row_level_security.sql) verify that paper accounts, positions, transactions, watchlists and snapshots use owner-scoped policies. |
| Uploaded profile images | The [appearance migration](../supabase/migrations/20261102180000_profile_appearance.sql) creates a publicly readable bucket for avatars and backgrounds. Each user can write only to their own folder. The upload form has no private visibility option. |
| Teammate access | The [database schema and policies](../supabase/migrations/20260924120000_paperstreet.sql) give each signed-in user access to their own paper account. PaperStreet has no teammate membership or shared-account role. |
| Provider credentials | The [Alpaca client](../src/lib/market-data/alpaca.ts), [Yahoo client](../src/lib/market-data/yahoo.ts) and [Supabase admin client](../src/lib/supabase/admin.ts) are server-only. Alpaca keys and the Supabase service-role key stay on the server. |
| Sign-up abuse controls | The [sign-up action](../src/lib/actions/auth.ts) checks the [per-process rate limit](../src/lib/rate-limit.ts) before calling Supabase. CAPTCHA is commented out in the [local configuration](../supabase/config.toml). Hosted CAPTCHA settings were not verified. |
