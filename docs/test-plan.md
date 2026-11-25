# Test plan

`npm test` runs every file in `test/`. `npm run test:e2e` runs Playwright. A flow with no browser test is marked Gap.

## Critical flows

| Flow | Logic test | Browser test |
| --- | --- | --- |
| Sign up creates a $100,000 paper book | `test/lock-signup-trigger.test.mjs` | Gap. The browser suite signs in with an account that already exists. |
| Sign in, stay on this app, sign out | `test/auth-return.test.mjs` | `e2e/smoke.spec.ts` (wrong password stays on login; a signed-in account sees the portfolio) |
| Public landing and leaderboard | `test/leaderboard-page.test.mjs`, `test/leaderboard-rank.test.mjs` | `e2e/smoke.spec.ts` |
| Buy and sell at the server price, cash stays integer | `test/paper-invariants.test.mjs` | `e2e/paper-trading.spec.ts` |
| Quotes and bars stay inside the rate limit | `test/rate-limits.test.mjs` | Gap. The browser buy uses the quote, but it does not assert the limit. |
| Watchlist add does not create a second row | Gap. No test file asserts the unique `(user_id, symbol)` retry. | Gap. |
| Password change checks the current password | `test/password-reauth.test.mjs` | Gap. |
| Reset restores cash and clears the ledger | `test/simulated-book.test.mjs` covers the separate practice book. The live reset is the SQL function and is not exercised here. | Gap. |
| A failed journey is logged without secrets | `test/error-log.test.mjs` | Gap. |
| Limits page matches what the app does | `test/declared-limits.test.mjs` | Gap. |

## Other logic

- `test/rls-assert.test.mjs` checks row-level security and that the browser cannot write cash.
- `test/profile-save.test.mjs`, `test/profile-appearance.test.mjs`, and `test/appearance-controls.test.mjs` cover the picture, background, and soundtrack.
- `test/leaderboard-profile-practice.test.mjs` covers the public profile image and the practice ranking.
- `test/security-notes.test.mjs` covers the auth callback and anonymous error reports.
- `test/simulated-clock.test.mjs` and `test/simulated-section.test.mjs` cover the practice clock.
- `test/serve-script.test.mjs` covers `dev` and `start`.
- `test/spend-limits.test.mjs` and `test/spend-services.test.mjs` check the spending notes in the README.
