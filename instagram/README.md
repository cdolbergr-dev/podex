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
`lib/instagram.tsx`.

One-time setup:

1. Create the Instagram account, then switch it to a professional account
   (Settings → Account type and tools → Switch to professional account → Creator or Business).
2. At developers.facebook.com, create an app with the use case
   "Manage messaging & content on Instagram", open **API setup with Instagram login**, add the
   account and generate an access token. The token is long-lived (60 days) and the page also
   shows the account's Instagram user ID. Publishing to your own account works while the app is
   in development mode; it doesn't need App Review.
3. In Vercel → Project → Settings → Environment Variables (Production), add:
   - `INSTAGRAM_USER_ID`
   - `INSTAGRAM_ACCESS_TOKEN`
   - Optional: `VERCEL_API_TOKEN` (Account Settings → Tokens) and `VERCEL_PROJECT_ID`
     (Project → Settings → General). Every run renews the Instagram token for another 60 days.
     If Instagram returns a new token string, the job saves it here, so it never expires.
4. Redeploy, then run the "instagram" schedule once from the Vercel dashboard to test it.

The job won't post if the account already posted in the last 20 hours. That way a repeated
schedule run, or a post you made by hand, doesn't lead to a double post.
