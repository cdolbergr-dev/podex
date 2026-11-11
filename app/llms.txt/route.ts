import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import { getSitemapCollections } from "@/lib/tcg/collections";

/**
 * A plain-text guide for AI assistants and agents (https://llmstxt.org): what Podex is, how its
 * addresses work, and where the main pages are.
 */
export async function GET() {
  const { pokemon } = await getSitemapCollections().catch(() => ({ pokemon: [] as string[] }));
  const popular = ["pikachu", "charizard", "mewtwo", "eevee", "gengar", "umbreon", "rayquaza", "lucario"].filter((slug) =>
    pokemon.includes(slug),
  );

  const text = `# ${brand.name}

> ${brand.description} Every English-language Pokémon Trading Card Game card, searchable by name, set, type, rarity, Pokémon and illustrator. Free, no account needed.

${brand.name} is a catalog of about 24,000 Pokémon TCG cards from 1999 to today, updated daily from TCGdex. Card data (names, attacks, rarities, illustrators) is in English; the site interface is available in English, Danish (/da) and Spanish (/es).

## Main pages

- [Explore all cards](${siteUrl}/): search by name, set or card number; filter by set, energy type and rarity (e.g. ${siteUrl}/?q=charizard&type=Fire)
- [Sets](${siteUrl}/sets): every expansion with release dates and card counts; each set has a page with all its cards, e.g. ${siteUrl}/sets/base-set
- [Pokémon](${siteUrl}/pokemon): every Pokémon by Pokédex number, each with its card history (first and newest printing, number of cards, evolutions) and every card it appears on
- [Artists](${siteUrl}/artists): every card illustrator, each with a page listing the cards they drew

## Address patterns

- Set: ${siteUrl}/sets/{set-name} (e.g. ${siteUrl}/sets/base-set)
- Card: ${siteUrl}/cards/{cardId}, where cardId is "{setId}-{number}" (e.g. ${siteUrl}/cards/base1-4 is Charizard from Base Set)
- Pokémon: ${siteUrl}/pokemon/{name} (e.g. ${siteUrl}/pokemon/pikachu); ${siteUrl}/pokemon/{pokedexNumber} redirects there
- Artist: ${siteUrl}/artists/{name} (e.g. ${siteUrl}/artists/mitsuhiro-arita)
- Danish or Spanish version of any page: add /da or /es in front of the path

## Popular Pokémon

${popular.map((slug) => `- [${slug[0].toUpperCase()}${slug.slice(1)}](${siteUrl}/pokemon/${slug})`).join("\n")}

## Optional

- [Sitemap](${siteUrl}/sitemap.xml): every page in every language
- Card details include Cardmarket market prices via TCGdex and a link to buy on CardNexus where available
`;

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
