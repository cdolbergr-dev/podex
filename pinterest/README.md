# Podex on Pinterest

## Daily pin

`/api/cron/pinterest` runs every day at 16:10 UTC (Vercel Schedule "pinterest" in `vercel.json`),
ten minutes after the Instagram post. It pins the card of the day
(`/api/instagram/card-of-the-day?format=pin`, 1000×1500) to one board. The pin links to the
card's page on the site, so unlike Instagram every pin sends visitors straight to Podex. The title,
description and alt text are built in `lib/pinterest.ts`.

Pinterest's access tokens last 30 days. The refresh token lasts 60 days, and Pinterest replaces it
every time the job uses it, so the current tokens can't live in an environment variable. They're
kept in a free **Vercel Global Config** store (called Edge Config before July 2026), together with
the last day that was pinned. The job refreshes the tokens about once a month and skips days it has
already pinned. If a run was missed, it catches up yesterday's card once.

Everything below is free. Pinterest renames menus now and then; if a label doesn't match exactly,
look for the closest one.

### 1. Pinterest business account and board

1. Go to <https://www.pinterest.com/business/create/> and create a **business account**, using the
   same project email as Instagram. You can also convert an existing account: Settings →
   **Account management** → **Convert to business**.
2. Profile name `Podex · Pokémon card catalog`, website `https://podexcards.com`. Use the same
   picture as Instagram ([../instagram/profile-picture.png](../instagram/profile-picture.png)).
3. Claim the website: Settings → **Claimed accounts** → **Websites** → **Claim**. Choose the
   **HTML tag** option and send the tag to Claude to add to the site. A claimed site gets your
   profile shown on every pin that links to it.
4. Create a board named **Pokémon Card of the Day**, with a description such as
   "A new Pokémon card every day, from every set ever printed."

### 2. Pinterest app

1. Go to <https://developers.pinterest.com/apps/> while signed in as the business account, and
   click **Connect app**.
2. Fill in the form: app name `Podex`, website `https://podexcards.com`, and a short
   description ("Posts a daily Pokémon card of the day from podexcards.com to our own board").
3. Once the app exists, open it and, under **Redirect URIs**, add exactly `http://localhost:8085/`.
4. Copy the **App ID** and **App secret key**.

**Trial vs Standard access:** a new app gets *Trial* access. With Trial access Pinterest refuses
to create real pins ("Apps with Trial access may not create Pins in production") and only allows
pins in its **API Sandbox**, where only you can see them. To post in the sandbox meanwhile:

1. On the app's page at <https://developers.pinterest.com/apps/>, generate a **sandbox token**.
2. Add it in Vercel as `PINTEREST_SANDBOX_TOKEN` and redeploy. The job then pins to a sandbox
   board, "Pokémon Card of the Day (sandbox)", which it creates itself, and keeps the real
   tokens fresh in the meantime.

To make pins public, click **Upgrade** on the app and request **Standard** access. Pinterest asks
for a short screen recording that shows the integration working: the `npm run pinterest:connect`
sign-in, then the job creating a pin (in the sandbox is fine). Approval usually takes a few days.
Once approved, delete `PINTEREST_SANDBOX_TOKEN` in Vercel and redeploy. The next run pins to the
real board, starting with that day's card.

### 3. Global Config store (Vercel)

1. In the Vercel dashboard, open the **podex** project → **Storage** → **Create Database** →
   **Global Config** → name it `podex-state` → **Create** → connect it to the project for all
   environments. This adds the `GLOBAL_CONFIG` environment variable.
2. Create an API token: avatar → **Account Settings** → **Tokens** → **Create**. Name it
   `podex edge config`, scope it to the team that owns the project, and set no expiration. The job
   needs it to save new tokens. Treat it like a password: it can manage the whole Vercel scope.
3. If the project belongs to a team, copy the **Team ID** from the team's **Settings → General**.

### 4. Environment variables

In Vercel → podex → **Settings → Environment Variables** (Production), add:

| Name | Value |
| --- | --- |
| `PINTEREST_APP_ID` | App ID from step 2 |
| `PINTEREST_APP_SECRET` | App secret key from step 2 |
| `PINTEREST_BOARD_ID` | the board id from step 5 |
| `PODEX_VERCEL_TOKEN` | token from step 3 |
| `PODEX_VERCEL_TEAM_ID` | team id from step 3 (only for a team project) |

Put the same values, plus `GLOBAL_CONFIG` (copy it from the Global Config store's page, or run
`vercel env pull`), in `.env.local` for the next step.

### 5. Connect

```bash
npm run pinterest:connect
```

The command opens Pinterest's consent page. Approve it, and the command saves the tokens to Edge
Config and lists your boards. Copy the board's id into `PINTEREST_BOARD_ID` in Vercel, then
redeploy so the job picks it up.

Run it again only if the job reports an expired or invalid refresh token. That happens only if the
job hasn't run for 60 days.

### Monthly limits

- Global Config on the free plan allows 250 writes a month. The job writes once per pin and once
  per token refresh, so about 31–35 writes a month.
- The Pinterest API allows 1,000 calls a day with Trial access. The job makes one or two.
