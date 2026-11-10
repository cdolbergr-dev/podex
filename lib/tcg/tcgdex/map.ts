import { tcgAssetUrl, tcgCardImageUrls } from "@/lib/tcg/tcgdex/assets";
import type { Card, CardAttack, CardSet } from "@/types/catalog";

type RawRecord = Record<string, unknown>;

function trim(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function asRecord(value: unknown): RawRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as RawRecord;
}

function normalizeReleaseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.includes("/") ? value : value.replace(/-/g, "/");
}

function normalizeType(value: string): string {
  return value.trim();
}

function legalityLabel(active: unknown): string | undefined {
  if (active === true) return "Legal";
  if (active === false) return "Not Legal";
  return undefined;
}

export function mapTcgdexSet(value: unknown): CardSet | null {
  const set = asRecord(value);
  if (!set) return null;
  const id = trim(set.id);
  const name = trim(set.name);
  if (!id || !name) return null;

  const cardCount = asRecord(set.cardCount);
  const serie = asRecord(set.serie);

  return {
    id,
    name,
    series: trim(serie?.name) ?? trim(serie?.id) ?? "",
    printedTotal: typeof cardCount?.official === "number" ? cardCount.official : undefined,
    total: typeof cardCount?.total === "number" ? cardCount.total : undefined,
    releaseDate: normalizeReleaseDate(trim(set.releaseDate)),
    images: {
      symbol: tcgAssetUrl(trim(set.symbol)),
      logo: tcgAssetUrl(trim(set.logo)),
    },
  };
}

export function mapTcgdexCard(value: unknown): Card | null {
  const card = asRecord(value);
  if (!card) return null;

  const id = trim(card.id);
  const name = trim(card.name);
  const localId = trim(card.localId);
  const set = mapTcgdexSet(card.set);
  if (!id || !name || !localId || !set) return null;

  const imageBase = trim(card.image);
  const images = tcgCardImageUrls(imageBase);

  const attacks = Array.isArray(card.attacks)
    ? card.attacks.flatMap((item) => {
        const attack = asRecord(item);
        if (!attack) return [];
        const attackName = trim(attack.name);
        if (!attackName) return [];
        const cost = Array.isArray(attack.cost)
          ? attack.cost.filter((entry): entry is string => typeof entry === "string").map(normalizeType)
          : [];
        const damageValue = attack.damage;
        const mapped: CardAttack = {
          name: attackName,
          cost,
          convertedEnergyCost: cost.length,
          damage: typeof damageValue === "number" ? String(damageValue) : trim(damageValue) ?? "",
          text: trim(attack.effect) ?? trim(attack.text) ?? "",
        };
        return [mapped];
      })
    : undefined;

  const abilities = Array.isArray(card.abilities)
    ? card.abilities.flatMap((item) => {
        const ability = asRecord(item);
        const abilityName = trim(ability?.name);
        const text = trim(ability?.effect) ?? trim(ability?.text);
        const type = trim(ability?.type) ?? "Ability";
        if (!abilityName || !text) return [];
        return [{ name: abilityName, text, type }];
      })
    : undefined;

  const mapEffects = (key: "weaknesses" | "resistances") => {
    if (!Array.isArray(card[key])) return undefined;
    const mapped = card[key].flatMap((item) => {
      const effect = asRecord(item);
      const type = trim(effect?.type);
      const effectValue = trim(effect?.value);
      if (!type || !effectValue) return [];
      return [{ type: normalizeType(type), value: effectValue }];
    });
    return mapped.length > 0 ? mapped : undefined;
  };

  const types = Array.isArray(card.types)
    ? card.types.filter((item): item is string => typeof item === "string").map(normalizeType)
    : [];

  const stage = trim(card.stage);
  const category = trim(card.category);
  const legal = asRecord(card.legal);
  const retreat = typeof card.retreat === "number" ? card.retreat : undefined;

  return {
    id,
    name,
    supertype: category === "Pokemon" ? "Pokémon" : category ?? "Card",
    subtypes: stage ? [stage] : [],
    hp: typeof card.hp === "number" ? String(card.hp) : trim(card.hp),
    types,
    evolvesFrom: trim(card.evolveFrom) ?? trim(card.evolvesFrom),
    attacks: attacks && attacks.length > 0 ? attacks : undefined,
    abilities: abilities && abilities.length > 0 ? abilities : undefined,
    weaknesses: mapEffects("weaknesses"),
    resistances: mapEffects("resistances"),
    retreatCost:
      retreat && retreat > 0 ? Array.from({ length: retreat }, () => "Colorless") : undefined,
    convertedRetreatCost: retreat,
    set,
    number: localId,
    artist: trim(card.illustrator) ?? trim(card.artist),
    rarity: trim(card.rarity),
    flavorText: trim(card.description) ?? trim(card.flavorText),
    legalities: legal
      ? {
          standard: legalityLabel(legal.standard),
          expanded: legalityLabel(legal.expanded),
          unlimited: legalityLabel(legal.unlimited),
        }
      : undefined,
    images,
  };
}
