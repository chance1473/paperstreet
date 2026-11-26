# Trading and operations readiness

## Settings read from the environment

`.env.example` is the list. None of these values is written into the source. There is no staging copy of them in the repository.

| Setting | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Address of the database project. Read from the environment. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser key for that project. Read from the environment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server key for trades and reset. Read from the environment. Never sent to the browser. |
| `ALPACA_API_KEY` | Market-data key. Read from the environment. Never sent to the browser. |
| `ALPACA_API_SECRET` | Market-data secret. Read from the environment. Never sent to the browser. |
| `NEXT_PUBLIC_APP_URL` | Address used in auth mail. Read from the environment. Local default in the example is `http://localhost:3000`. |


This source review covers the PaperStreet code on main at `354e77f`.
Local verification and deployed settings are listed separately.

| Check | Finding |
| --- | --- |
| Order retry | The [order ticket](../src/components/trading/order-ticket.tsx) disables confirmation while the request is pending and displays a failure message. The [server action](../src/lib/actions/trade.ts) sends no idempotency key with the fill. Retrying after a lost response can create another simulated fill if the first one committed. |
| Lookup indexes | The [initial migration](../supabase/migrations/20260924120000_paperstreet.sql) indexes positions by owner, transactions by owner and time or symbol, watchlist rows by owner and time, and snapshots by owner and capture time. These match the account lookups in the [portfolio module](../src/lib/portfolio.ts). |
| Log redaction and retention | The [log tests](../test/error-log.test.mjs) verify redaction of password assignments, quoted credential fields, and Authorization Bearer values. The [setup guide](../README.md) documents a configurable log path and host-managed rotation. Persistent storage and rotation on a deployed instance were not verified. |
| Staging migrations | The [database migrations](../supabase/migrations) are checked in and were applied to an isolated local Supabase instance for the paper-trading browser check. The [GitHub workflow](../.github/workflows/checks.yml) runs unit tests. A staging migration receipt was not available. |
