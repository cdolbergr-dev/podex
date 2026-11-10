import { slugify } from "@/lib/slug";

/**
 * A set's page: /sets/base-set. Set names are unique in the catalog today, so the name alone
 * is the address; should two ever match, the newest set keeps it and /sets/{setId} still
 * reaches the other (it redirects to the name when that's unambiguous).
 */
export function setPath(set: { name: string }): string {
  return `/sets/${slugify(set.name)}`;
}
