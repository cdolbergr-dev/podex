import type { Card, CardAttack, CardSet } from "@/types/catalog";

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): RawRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as RawRecord;
}

export function mapSet(value: unknown): CardSet | null {
  const set = asRecord(value);
  if (!set) return null;
  const id = asString(set.id);
  const name = asString(set.name);
  if (!id || !name) return null;

  const images = asRecord(set.images);

  return {
    id,
    name,
    series: asString(set.series) ?? "",
    printedTotal: asNumber(set.printedTotal),
    total: asNumber(set.total),
    releaseDate: asString(set.releaseDate),
    images: {
      symbol: asString(images?.symbol) ?? "",
      logo: asString(images?.logo) ?? "",
    },
  };
}

export function mapCard(value: unknown): Card | null {
  const card = asRecord(value);
  if (!card) return null;

  const id = asString(card.id);
  const name = asString(card.name);
  const set = mapSet(card.set);
  const number = asString(card.number);
  if (!id || !name || !set || !number) return null;

  const images = asRecord(card.images);
  const small = asString(images?.small) ?? "";
  const large = asString(images?.large) ?? small;
  const legalities = asRecord(card.legalities);

  const abilities = Array.isArray(card.abilities)
    ? card.abilities.flatMap((item) => {
        const ability = asRecord(item);
        const abilityName = asString(ability?.name);
        const text = asString(ability?.text);
        const type = asString(ability?.type);
        if (!ability || !abilityName || !text || !type) return [];
        return [{ name: abilityName, text, type }];
      })
    : undefined;

  const attacks = Array.isArray(card.attacks)
    ? card.attacks.flatMap((item) => {
        const attack = asRecord(item);
        const attackName = asString(attack?.name);
        if (!attack || !attackName) return [];
        const mapped: CardAttack = {
          name: attackName,
          cost: asStringList(attack.cost),
          convertedEnergyCost: asNumber(attack.convertedEnergyCost) ?? 0,
          damage: asString(attack.damage) ?? "",
          text: asString(attack.text) ?? "",
        };
        return [mapped];
      })
    : undefined;

  const effects = (key: "weaknesses" | "resistances") => {
    if (!Array.isArray(card[key])) return undefined;
    const mapped = card[key].flatMap((item) => {
      const effect = asRecord(item);
      const type = asString(effect?.type);
      const effectValue = asString(effect?.value);
      if (!type || !effectValue) return [];
      return [{ type, value: effectValue }];
    });
    return mapped.length > 0 ? mapped : undefined;
  };

  return {
    id,
    name,
    supertype: asString(card.supertype) ?? "Card",
    subtypes: asStringList(card.subtypes),
    hp: asString(card.hp),
    types: asStringList(card.types),
    evolvesFrom: asString(card.evolvesFrom),
    evolvesTo: asStringList(card.evolvesTo).length > 0 ? asStringList(card.evolvesTo) : undefined,
    rules: asStringList(card.rules).length > 0 ? asStringList(card.rules) : undefined,
    abilities: abilities && abilities.length > 0 ? abilities : undefined,
    attacks: attacks && attacks.length > 0 ? attacks : undefined,
    weaknesses: effects("weaknesses"),
    resistances: effects("resistances"),
    retreatCost: asStringList(card.retreatCost).length > 0 ? asStringList(card.retreatCost) : undefined,
    convertedRetreatCost: asNumber(card.convertedRetreatCost),
    set,
    number,
    artist: asString(card.artist),
    rarity: asString(card.rarity),
    flavorText: asString(card.flavorText),
    nationalPokedexNumbers: Array.isArray(card.nationalPokedexNumbers)
      ? card.nationalPokedexNumbers.filter((item): item is number => typeof item === "number")
      : undefined,
    legalities: legalities
      ? {
          standard: asString(legalities.standard),
          expanded: asString(legalities.expanded),
          unlimited: asString(legalities.unlimited),
        }
      : undefined,
    images: { small, large },
  };
}
