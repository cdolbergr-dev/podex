# Podex on Instagram

## Profile

- **Username:** `podexcardsdotcom` ([instagram.com/podexcardsdotcom](https://www.instagram.com/podexcardsdotcom/))
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
[Instagram API with Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started).
This setup needs no Facebook Page and costs nothing.

Right after the post, the job publishes a story (`?format=story`, 1080×1920) that shows the card
and its page on the site, for example `podexcards.com/cards/sm8-106`. Instagram's API can't add
link stickers (or any stickers) to stories, so the address is printed on the image rather than
tappable. If the story fails, the post still stands and the job's response has a `storyError`.

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

1. Go to <https://developers.facebook.com>, click **Login** in the upper-right corner and log in
   with Facebook. Log in first: while you're logged out, the apps page only shows "Sorry, the link
   you followed may be broken". If this is your first time, click **Get started** and finish the
   developer registration (it confirms your email address and asks what you do; pick
   **Developer**). Then open <https://developers.facebook.com/apps>.
2. Click **Create App**. Give it a name (for example `Podex Cards`), pick the use case
   **Manage messaging & content on Instagram**, and attach it to your business portfolio when
   asked. **API setup with Unified login** only shows up for apps that a business portfolio owns.
3. Leave **App Mode** on **Development**. While the app only posts to your own account, the
   default Standard Access is enough and no App Review is needed.

### 5. Create a Unified login configuration

1. In the app's left menu, open **Instagram** → **API setup with Unified login**. (If the menu
   looks different: **Use cases** → **Manage messaging & content on Instagram** → **Customize** →
   **API setup with Unified login**.)
2. Under **Configure your app**, click **Create new configuration**.
3. Permissions: keep the defaults. They include `instagram_basic` and
   `instagram_content_publish`, which the posting job needs. You can skip the ad account.
4. If it asks how long the access token should last, choose **Never** (or the longest option).
   The configuration preview shows the token type and expiration.
5. Click **Use this configuration**, enter `https://podexcards.com/` as the **Redirect URL** and
   click **Save**. The **Login URL** it shows afterwards isn't needed.

Skip the other steps on that page (webhooks, a login button, exchanging codes). They're for
letting other people connect their accounts.

### 6. Add the account and generate the access token

First, the business portfolio has to own the Instagram profile, or the token dialog says
"Instagram Pro account required". Open <https://business.facebook.com/settings>, select the
**Podex Cards** portfolio, go to **Business assets** → **Instagram profiles** → **Add** and log in
as podexcardsdotcom. (Creating a portfolio fails with "Facebook account too new" for brand-new
Facebook accounts; wait an hour or a day and try again.)

1. On the same page, open **Generate access tokens** and click **Add account**. Enter
   `podexcardsdotcom` and pick the **Instagram Tester** role.
2. Accept the invitation. Open <https://www.instagram.com> in a browser (not the app), log in as
   podexcardsdotcom, and go to **Settings** → **Website permissions** → **Apps and websites** →
   **Tester invites** → **Accept**.
3. Back in the Meta app, click **Generate token** next to podexcardsdotcom. In the dialog, pick
   the **Podex Cards** portfolio and the podexcardsdotcom account, skip the ad account, and
   **copy the token right away**. Meta shows it only once.
   - Treat it like a password. Don't paste it into chats, issues or the code.

### 7. Find the Instagram account ID

Run this in Terminal, with your token pasted in place of `PASTE_TOKEN_HERE`:

```bash
curl -s "https://graph.facebook.com/v27.0/me/assigned_instagram_accounts?fields=id,username&access_token=PASTE_TOKEN_HERE"
```

The response looks like `{"data":[{"id":"17841400000000000","username":"podexcardsdotcom"}]}`. The
number in **`id`** is `INSTAGRAM_USER_ID`.

If you get an error or an empty `data` list, the token was copied incompletely, or the account
wasn't accepted as a tester. Do step 6 again.

### 8. Add the values to Vercel

In Vercel → the podex project → **Settings** → **Environment Variables**, add these for the
**Production** environment, marked as **Sensitive**:

| Name | Value |
| --- | --- |
| `INSTAGRAM_USER_ID` | the `id` from step 7 |
| `INSTAGRAM_ACCESS_TOKEN` | the token from step 6 |

The default Unified login configuration gives a system-user token that never expires. If yours
shows an expiry date in step 5, put it in your calendar and generate a new token (step 6.3)
before it runs out.

### 9. Deploy and test

1. Redeploy, so the new variables take effect: Vercel → **Deployments** → ⋯ on the latest →
   **Redeploy**.
2. Check the image: open <https://podexcards.com/api/instagram/card-of-the-day>.
3. Post once by running the "instagram" schedule from the Vercel dashboard. The response is JSON:
   - `"ok": true` with a `postId` and a `storyId`: the post and the story are live.
   - `"skipped": "already posted today"`: the account posted in the last 20 hours.
   - `"ok": false` with an `error`: Instagram's error message, for example an expired token or a
     missing permission.
