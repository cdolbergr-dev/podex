/** Bearer-token check for scheduled/maintenance endpoints (CRON_SECRET). */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
