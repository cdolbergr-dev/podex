# Podex on Instagram

## Profile

- **Username:** `podexcards` (matches podexcards.com)
- **Name:** `Podex · Pokémon card catalog` (the name field is searchable on Instagram)
- **Profile picture:** [profile-picture.png](profile-picture.png) (1080×1080; Instagram crops it to a circle)
- **Website:** `https://podexcards.com`
- **Bio** (150 characters max):

  ```
  Every Pokémon card, in one quiet catalog 🃏
  A new card of the day, every day ✨
  Browse, collect & track your favorites 👇
  ```

## Daily posting

`/api/cron/instagram` runs every day at 16:00 UTC (Vercel Schedule "instagram" in `vercel.json`).
It posts the image from `/api/instagram/card-of-the-day` with a caption built in
`lib/instagram.tsx`, through the
[Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/).
This setup needs no Facebook Page and costs nothing.

The job won't post if the account already posted in the last 20 hours. That way a repeated
schedule run, or a post you made by hand, doesn't lead to a double post.

Below is the one-time setup. Instagram and Meta change their menu names now and then; if a label
doesn't match exactly, look for the closest one.

### 1. Create the Instagram account

1. Use an email address that belongs to the project, not a personal one, so the account can be
   handed over later (for example a `hello@podexcards.com` alias or a new Gmail address).
2. Install the Instagram app and tap **Create new account**, or go to
   <https://www.instagram.com/accounts/emailsignup/> in a browser.
3. Enter the email address, then fill in the rest:
   - **Name:** `Podex · Pokémon card catalog`
   - **Username:** `podexcards`. If it's taken, try `podex.cards` or `podexcards.app`.
   - **Password:** a long, unique one, saved in your password manager
   - **Birthday:** your own; it isn't shown on the profile
4. Confirm the code Instagram sends to the email address.
5. Turn on two-factor authentication: Profile → ☰ menu → **Accounts Center** →
   **Password and security** → **Two-factor authentication**. An account that posts
   automatically every day is worth protecting.

### 2. Fill in the profile

On your profile, tap **Edit profile**:

1. **Change profile picture** → upload [profile-picture.png](profile-picture.png).
2. Paste the **Bio** from the top of this file.
3. **Links** → **Add external link** → `https://podexcards.com`, title `Podex`.

### 3. Switch to a professional account

The API can only post to professional accounts.

1. Profile → ☰ menu → **Settings and activity**.
2. Under **For professionals**, tap **Account type and tools** →
   **Switch to professional account**.
3. Choose a category, for example **Website** or **Games/toys**, and decide whether to show it on
   the profile.
4. Choose **Creator** or **Business**. Both work with the API. Business suits a website best
   and offers contact buttons.
5. Skip the steps that ask you to connect a Facebook Page; it isn't needed.
6. Keep the account **public**. Meta requires that for accounts added to an app.

### 4. Create a Meta developer app

You need a Facebook account to sign in to Meta for Developers. Your personal one is fine; it
isn't shown anywhere on Instagram.

1. Go to <https://developers.facebook.com/apps> and log in. If this is your first time, click
   **Get started** and finish the developer registration (it confirms your email address and
   asks what you do; pick **Developer**).
2. Click **Create App** in the upper-right corner.
3. **App details:** app name `Podex Instagram`, contact email: yours. Click **Next**.
4. **Use case:** pick **Other**, then **Next**.
5. **App type:** pick **Business**, then **Next**. Only business apps can add the Instagram
   product.
6. Skip connecting a business portfolio; that's only for publishing the app to other users.
7. Click **Create app**. You may need to enter your Facebook password again.
8. On the app's dashboard, scroll to the **Instagram** product and click **Set up**.
   **API setup with Instagram login** is added automatically.

### 5. Add the account and generate the access token

1. In the app's left menu, open **Instagram** → **API setup with Instagram business login**.
2. Under **1. Generate access tokens**, click **Add account**.
3. A popup asks you to log in to Instagram. Log in as **podexcards**, not your personal
   account, and allow the permissions it asks for.
   - If the account doesn't appear afterwards, open **App Roles** → **Roles**, add podexcards as
     an **Instagram Tester**, then accept the invitation in the Instagram app
     (Settings and activity → **Website permissions** → **Apps and websites** → **Tester invites**).
4. Back in API setup, click **Generate token** next to podexcards, log in again if asked, tick
   the box to confirm and **copy the access token**.
   - This token is long-lived: it's valid for 60 days, and the daily job renews it.
   - Treat it like a password. Don't paste it into chats, issues or the code.
5. You can skip **3. Set up Instagram business login** (redirect URLs and so on); it's only for
   letting other people log in to the app.

Leave the app in **development mode**. While the app only posts to accounts that have a role on
it, the default Standard Access is enough, according to Meta's overview, and no App Review is
needed.

### 6. Find the Instagram user ID

Run this in Terminal, with your token pasted in place of `PASTE_TOKEN_HERE`:

```bash
curl -s "https://graph.instagram.com/v27.0/me?fields=user_id,username&access_token=PASTE_TOKEN_HERE"
```

The response looks like `{"user_id":"17841400000000000","username":"podexcards","id":"..."}`.
The number in **`user_id`** is `INSTAGRAM_USER_ID`. Don't use `id`; that's a different ID that
only applies inside your app.

If you get an error instead, the token was copied incompletely or for the wrong account. Generate
it again.

### 7. Add the values to Vercel

In Vercel → the podex project → **Settings** → **Environment Variables**, add these for the
**Production** environment, marked as **Sensitive**:

| Name | Value |
| --- | --- |
| `INSTAGRAM_USER_ID` | the `user_id` from step 6 |
| `INSTAGRAM_ACCESS_TOKEN` | the token from step 5 |
| `VERCEL_API_TOKEN` (optional) | a token from Vercel → Account Settings → **Tokens** → **Create** |
| `VERCEL_PROJECT_ID` (optional) | Project → Settings → **General** → Project ID |

Every run renews the Instagram token for another 60 days. Instagram usually returns the same
token, but if it returns a new one, the two optional variables let the job save it to Vercel.
Without them, the job works until the stored token runs out. In that case, generate a new token
(step 5) and replace the value.

### 8. Deploy and test

1. Redeploy, so the new variables take effect: Vercel → **Deployments** → ⋯ on the latest →
   **Redeploy**.
2. Check the image: open <https://podexcards.com/api/instagram/card-of-the-day>.
3. Post once by running the "instagram" schedule from the Vercel dashboard. The response is JSON:
   - `"ok": true` with a `postId`: the post is live on the profile.
   - `"skipped": "already posted today"`: the account posted in the last 20 hours.
   - `"ok": false` with an `error`: Instagram's error message, for example an expired token or a
     missing permission.

A new token can't be renewed during its first 24 hours, so the first run may show an `error`
under `refresh`. That's expected and doesn't stop the post.
