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

## Whose record it is

There is no organization and no shared-tenant model. The owner key is `user_id`. A profile row uses `id`, and that id is the same user.

The read path is the select policy `user_id = auth.uid()` in [the row-level-security migration](../supabase/migrations/20261104210000_assert_row_level_security.sql). Profiles use `id = auth.uid()` because the profile primary key is the user id. A browser read cannot cross owners.

The write path is `execute_paper_trade` in [the schema migration](../supabase/migrations/20260924120000_paperstreet.sql). It takes `p_user_id` and filters the account, position, transaction, and snapshot writes by that user.

These paths skip the owner filter:

- Service-role functions. `execute_paper_trade` and `reset_paper_account` run as the service role, which bypasses row-level security, and they still filter by `p_user_id`. The leaderboard read also uses the service role so it can rank every public book.
- The public storage bucket `profile-images`. Its select policy is not `user_id = auth.uid()`.

The app is not multi-tenant. The leaderboard is the cross-user read, and it is the public ranking.
