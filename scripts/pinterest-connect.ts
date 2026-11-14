/**
 * One-time Pinterest sign-in for the daily pin (app/api/cron/pinterest). Opens Pinterest's consent
 * page, catches the redirect on localhost, saves the tokens to Global Config and lists your boards so
 * you can copy the board id. Needs PINTEREST_APP_ID, PINTEREST_APP_SECRET, GLOBAL_CONFIG and
 * VERCEL_API_TOKEN in .env.local. Run again if the job ever reports an expired refresh token.
 *   npm run pinterest:connect
 */
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { loadProjectEnv } from "../lib/load-env";
import { hasGlobalConfig } from "../lib/global-config";
import { listPinterestBoards, requestPinterestToken, savePinterestState, stateFromToken } from "../lib/pinterest";

loadProjectEnv();

const PORT = 8085;
/** Must be listed under the app's redirect URIs at developers.pinterest.com. */
const REDIRECT_URI = `http://localhost:${PORT}/`;
const SCOPES = "boards:read,boards:write,pins:read,pins:write";

async function main() {
  const appId = process.env.PINTEREST_APP_ID?.trim();
  if (!appId || !process.env.PINTEREST_APP_SECRET?.trim()) throw new Error("Set PINTEREST_APP_ID and PINTEREST_APP_SECRET in .env.local.");
  if (!hasGlobalConfig()) throw new Error("Set GLOBAL_CONFIG and VERCEL_API_TOKEN in .env.local (see pinterest/README.md).");

  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://www.pinterest.com/oauth/");
  authorize.search = new URLSearchParams({ client_id: appId, redirect_uri: REDIRECT_URI, response_type: "code", scope: SCOPES, state }).toString();

  const code = await new Promise<string>((resolve, reject) => {
    const server = createServer((request, response) => {
      const query = new URL(request.url ?? "/", REDIRECT_URI).searchParams;
      if (!query.has("code") && !query.has("error")) {
        response.writeHead(404).end();
        return;
      }
      const ok = query.get("state") === state && query.get("code");
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(ok ? "Podex is connected to Pinterest. You can close this tab." : "Pinterest sign-in failed. Check the terminal.");
      server.close();
      if (ok) resolve(query.get("code")!);
      else reject(new Error(`Pinterest sign-in failed: ${query.get("error") ?? "state mismatch"}`));
    });
    server.listen(PORT, () => {
      console.log(`Opening Pinterest… If nothing opens, visit:\n${authorize}\n`);
      execFile("open", [authorize.toString()], () => {});
    });
  });

  const token = await requestPinterestToken({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI, continuous_refresh: "true" });
  await savePinterestState(stateFromToken(token));
  console.log("Saved the Pinterest tokens to Global Config.\n\nYour boards (put the id in PINTEREST_BOARD_ID):");
  for (const board of await listPinterestBoards(token.access_token)) console.log(`  ${board.id}  ${board.name}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
