/**
 * Species details from PokéAPI (https://pokeapi.co), a free public API: generation, category
 * ("Mouse Pokémon") and a Pokédex entry. PokéAPI has English and Spanish text but no Danish;
 * Danish pages show the English text. Callers cache the result; their fair-use policy asks
 * for exactly that.
 */

export type SpeciesText = { genus?: string; entry?: string; game?: string };

export type PokemonSpecies = {
  generation?: number;
  legendary: boolean;
  mythical: boolean;
  en: SpeciesText;
  es: SpeciesText;
};

type Named = { name: string };
type ApiSpecies = {
  generation?: { name?: string };
  is_legendary?: boolean;
  is_mythical?: boolean;
  genera?: { genus: string; language: Named }[];
  flavor_text_entries?: { flavor_text: string; language: Named; version?: Named }[];
};

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/** "omega-ruby" → "Omega Ruby"; "lets-go-pikachu" → "Lets Go Pikachu". */
function gameName(version: string | undefined): string | undefined {
  if (!version) return undefined;
  return version
    .split("-")
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function cleanText(text: string): string {
  return text
    .replace(/­\s*/g, "")
    .replace(/[\f\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textFor(species: ApiSpecies, language: "en" | "es"): SpeciesText {
  const genus = species.genera?.find((item) => item.language.name === language)?.genus;
  // The earliest game's entry (PokéAPI lists them by game release), as a nod to its history.
  const first = species.flavor_text_entries?.find((item) => item.language.name === language);
  return {
    genus,
    entry: first ? cleanText(first.flavor_text) : undefined,
    game: gameName(first?.version?.name),
  };
}

export async function fetchPokemonSpecies(dex: number): Promise<PokemonSpecies | null> {
  if (!Number.isInteger(dex) || dex < 1 || dex > 2000) return null;
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${dex}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const species = (await response.json()) as ApiSpecies;
    const roman = species.generation?.name?.replace(/^generation-/, "");
    return {
      generation: roman ? ROMAN[roman] : undefined,
      legendary: Boolean(species.is_legendary),
      mythical: Boolean(species.is_mythical),
      en: textFor(species, "en"),
      es: textFor(species, "es"),
    };
  } catch {
    return null;
  }
}
