import type { Locale } from "@/lib/i18n/config";
import da from "@/lib/i18n/dictionaries/da";
import en, { type Dictionary } from "@/lib/i18n/dictionaries/en";
import es from "@/lib/i18n/dictionaries/es";

export type { Dictionary };

/** All UI dictionaries. Small enough to ship to the client (the language picker switches live). */
export const dictionaries: Record<Locale, Dictionary> = { en, da, es };
