# PaperStreet

A paper brokerage for US stocks and cryptocurrency. Live prices come from Alpaca. Cash, positions, and orders are simulated. The app never submits brokerage orders and never accepts real-money deposits.

**Paper trading only — no real money.**

Sign-in failures, order failures, and page render errors are appended to `logs/journey-errors.log`. Passwords, tokens, and keys are redacted. The directory is not committed.

To retain these logs across deployments, set `JOURNEY_ERROR_LOG` to a writable path on persistent storage and configure log rotation on the host. PaperStreet does not rotate the file automatically.

## Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS and Radix-based UI components
- Supabase Auth, Postgres, and Row Level Security
- Alpaca Market Data for US stocks and crypto
- Lightweight Charts

## How money is stored

| Value | Representation |
| --- | --- |
| Cash and order totals | Integer cents. A new account starts at `10000000` cents (`$100,000.00`). |
| Prices | Integer micros. `$1 = 1,000,000`. |
| Quantities | Integer units. `1` share or coin `= 100,000,000` units (8 decimal places). |

Order value in cents is `round(quantity_units * price_micros / 1_000_000_000_000)`. That math runs in Postgres inside one transaction. The browser never supplies the execution price, cash balance, or position quantity used to fill an order.

Account value is cash plus the current market value of positions. It is not an editable column.

## Services you need

1. A [Supabase](https://supabase.com) project.
2. An [Alpaca](https://alpaca.markets) account with **market data** keys. Do not place live or paper orders through Alpaca. PaperStreet only calls market-data and asset-reference endpoints.

Paid services a deployment can turn on:

- Supabase, for auth and the database.
- Alpaca, for market data.

The local app can run without either bill: local Supabase, and public quotes when Alpaca keys are absent. No other paid service is used.

Where each spending alert and hard stop is set:

- Supabase: the organization billing page in the Supabase dashboard. The alert and the hard stop live there, not in this repository.
- Alpaca: the account billing page in the Alpaca dashboard. The alert and the hard stop live there, not in this repository.

This file records those places only. It does not store amounts, account ids, or secrets.

## Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Trades, reset, snapshots, leaderboard. |
| `ALPACA_API_KEY` | Server only |
| `ALPACA_API_SECRET` | Server only |
| `NEXT_PUBLIC_APP_URL` | Auth redirects and deployment docs. Use `http://localhost:3000` locally. |

Never prefix the service role key or Alpaca secret with `NEXT_PUBLIC_`.

## Supabase setup

1. Create a project.
2. In Authentication → Providers, enable Email.
3. In Authentication → URL Configuration, set Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` as a redirect URL. Add the production URL before deploying.
4. Open the SQL editor and run [`supabase/migrations/20260924120000_paperstreet.sql`](supabase/migrations/20260924120000_paperstreet.sql).

If you use the Supabase CLI from this directory:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration creates:

- `profiles`
- `paper_accounts`
- `positions` (one open row per user and symbol)
- `transactions`
- `watchlist_items`
- `portfolio_snapshots`

A trigger on `auth.users` creates a profile, a `$100,000` paper account, and an opening snapshot. Row Level Security lets a signed-in user read only their own rows. Cash, positions, and the ledger cannot be updated from the browser. Trade and reset functions execute only as the service role, and only after a server action checks the session and loads a fresh Alpaca price.

If email confirmation is enabled, the paper account still exists as soon as the auth user is created. The user can sign in after confirming the email.

## Alpaca setup

1. Create API keys in the Alpaca dashboard.
2. Put the key id in `ALPACA_API_KEY` and the secret in `ALPACA_API_SECRET`.
3. Leave trading disabled for this app. PaperStreet does not call order endpoints.

Data sources:

- Stock snapshots and bars: `https://data.alpaca.markets/v2/stocks/...` with `feed=iex`
- Crypto snapshots and bars: `https://data.alpaca.markets/v1beta3/crypto/us/...`
- Asset search and company fields: `https://paper-api.alpaca.markets/v2/assets` (read only)
- Market clock: `https://paper-api.alpaca.markets/v2/clock`
- Movers, when the account allows it: `https://data.alpaca.markets/v1beta1/screener/stocks/movers`

User-facing crypto symbols are `BTC`, `ETH`, and so on. Requests use Alpaca pairs such as `BTC/USD`.

Quotes are cached for about 10 seconds, bars for 60 seconds, and the asset universe for 6 hours. Pages poll quotes every 15 seconds instead of opening a browser WebSocket, so the Alpaca secret never reaches client JavaScript. Closed markets keep the last trade and show a market-closed badge when the clock says the equity session is shut. Missing symbols, rate limits, and network failures surface as empty prices or a short error banner.

## Supported startup

Prerequisite: Node.js 22. Copy `.env.example` to `.env.local` and fill in the values from the table above. Alpaca keys are optional; without them the app uses Yahoo Finance for quotes.

```bash
npm install
npm start
```

`npm start` runs `node scripts/serve.mjs`. The process listens on `PORT` (default 3000) before Next finishes booting. Open `http://localhost:3000`.

`npm run dev` uses the same listener. A local Supabase stack is required for signup, trades, and the live leaderboard. GitHub checks install with `npm ci` and run `npm test` on Node 22.

The deploy branch `main` is protected. It cannot be force-pushed or deleted.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Other commands:

```bash
npm run lint
npm run build
npm start
```

## Using the app

- Create an account with a display name and username. The paper book starts at `$100,000.00`.
- Search Markets for any active US equity Alpaca lists, or for supported crypto. Popular tickers are shortcuts, not a hardcoded universe.
- Open an asset to chart `1D`, `1W`, `1M`, `3M`, `1Y`, and `ALL`, then buy or sell at the latest server price by quantity or dollars.
- Portfolio, watchlist, transactions, and the dashboard read that user's rows only.
- The leaderboard is public and shows rank, display name, username, portfolio value, and percent return. It omits email, positions, and transactions.
- Settings can change the display name, username, and password. Reset restores `$100,000`, deletes positions, **permanently clears the transaction ledger**, and deletes performance snapshots, then writes a new `$100,000` opening snapshot. The watchlist is kept. Reset runs in one database transaction.

Portfolio charts only plot saved snapshots. Snapshots are written when the account opens, after each trade, and at most every 15 minutes when the dashboard can price the book. The app does not invent history for dates before those snapshots exist.

## Production

Deploy on Vercel (or any Node host that runs Next.js):

1. Set every variable from `.env.example` in the host's environment. Mark the service role and Alpaca values as server secrets.
2. Add the production site URL and `https://YOUR_DOMAIN/auth/callback` in Supabase Auth.
3. Run the SQL migration against the production database before inviting users.
4. Build with `npm run build`.

The Node entry point uses the address of the connecting peer for anonymous rate limits. Behind a reverse proxy, traffic from that proxy shares the same limit. Authenticated actions use the signed-in user ID.

## What this app will not do

- It will not submit orders to Alpaca or any other broker.
- It will not accept deposits, withdrawals, or real currency.
- It will not show a portfolio chart for periods that have no stored snapshots.
