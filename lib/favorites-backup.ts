import { cleanCardIds, cleanListName, DEFAULT_LIST_NAME, type FavoriteList } from "@/lib/favorites-storage";

/**
 * Compact, URL-safe encoding of every favorite list. Used both for the server-set cookie copy
 * (which survives Safari's 7-day limit on script storage) and for "Back up all lists" links.
 *
 * Format: "z" + base64url(deflate-raw(JSON)) when the browser can compress, else
 * "j" + base64url(JSON). JSON is { v: 1, lists: [{ n: name, c: [cardId, …] }], o: [owned cardId, …] }.
 */

export type BackupList = { name: string; cardIds: string[] };
export type FavoriteBackup = { lists: BackupList[]; owned: string[] };

const MAX_LISTS = 100;
const MAX_CARDS_PER_LIST = 2000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const output = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(output).arrayBuffer());
}

const canCompress = () => typeof CompressionStream === "function" && typeof DecompressionStream === "function";

export async function encodeFavoriteLists(lists: FavoriteList[], owned: string[]): Promise<string> {
  const json = JSON.stringify({ v: 1, lists: lists.map((list) => ({ n: list.name, c: list.cardIds })), o: owned });
  const bytes = new TextEncoder().encode(json);
  if (canCompress()) return `z${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
  return `j${toBase64Url(bytes)}`;
}

/** Decodes and sanitizes a backup. Returns null for anything malformed. */
export async function decodeFavoriteLists(encoded: string): Promise<FavoriteBackup | null> {
  try {
    const kind = encoded[0];
    const payload = fromBase64Url(encoded.slice(1));
    const bytes =
      kind === "z" && canCompress() ? await pipe(payload, new DecompressionStream("deflate-raw")) : kind === "j" ? payload : null;
    if (!bytes) return null;

    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { v?: unknown; lists?: unknown; o?: unknown };
    if (parsed.v !== 1 || !Array.isArray(parsed.lists)) return null;

    const lists: BackupList[] = [];
    for (const raw of parsed.lists.slice(0, MAX_LISTS)) {
      if (!raw || typeof raw !== "object") continue;
      const { n, c } = raw as { n?: unknown; c?: unknown };
      const cardIds = Array.isArray(c)
        ? [...new Set(c.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80))].slice(
            0,
            MAX_CARDS_PER_LIST,
          )
        : [];
      lists.push({ name: cleanListName(typeof n === "string" ? n : "") || DEFAULT_LIST_NAME, cardIds });
    }
    return lists.length > 0 ? { lists, owned: cleanCardIds(parsed.o) } : null;
  } catch {
    return null;
  }
}

/** Cards in a backup: saved in any list or marked as owned. */
export function countBackupCards(backup: FavoriteBackup): number {
  return new Set([...backup.lists.flatMap((list) => list.cardIds), ...backup.owned]).size;
}

/** Stable fingerprint of the lists' contents, to tell whether a backup is out of date. */
export function fingerprintLists(lists: FavoriteList[], owned: string[]): string {
  const text = JSON.stringify([lists.map((list) => [list.name, list.cardIds]), owned]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

const LAST_BACKUP_KEY = "podex.favoritesBackedUp";

export type LastBackup = { at: number; fingerprint: string };

export function readLastBackup(): LastBackup | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAST_BACKUP_KEY) ?? "null") as LastBackup | null;
    return parsed && typeof parsed.at === "number" && typeof parsed.fingerprint === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberBackup(lists: FavoriteList[], owned: string[]): void {
  try {
    window.localStorage.setItem(
      LAST_BACKUP_KEY,
      JSON.stringify({ at: Date.now(), fingerprint: fingerprintLists(lists, owned) }),
    );
    window.dispatchEvent(new Event(BACKUP_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export const BACKUP_CHANGE_EVENT = "podex-favorites-backup-change";

/** `restorePath` is /favorites/restore in the visitor's language. */
export function backupRestoreUrl(encoded: string, restorePath = "/favorites/restore"): string {
  // After "#": never sent to the server, so lists don't end up in request logs.
  return `${window.location.origin}${restorePath}#${encoded}`;
}
