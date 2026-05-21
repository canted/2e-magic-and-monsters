import type { BrowseFilters, CreatureRecord, ItemRecord, SpellFilters, SpellRecord } from "./types";

export function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function includesQuery(record: { searchText: string }, query: string): boolean {
  return !query || record.searchText.includes(query);
}

function includesAnySource(recordSources: string[], selectedSources: string[]): boolean {
  if (selectedSources.length === 0) return true;
  const sources = new Set(recordSources);
  return selectedSources.some((source) => sources.has(source));
}

export function taxonomyValue(kind: "school" | "sphere", value: string): string {
  return `${kind}:${value}`;
}

export function filterSpells(records: SpellRecord[], filters: SpellFilters): SpellRecord[] {
  const query = normalizeQuery(filters.search);
  const selectedTaxonomy = new Set(filters.taxonomy);
  const classConstrained = !(filters.wizard && filters.priest);

  return records.filter((record) => {
    if (classConstrained) {
      if (filters.wizard && record.spellClass !== "Wizard") return false;
      if (filters.priest && record.spellClass !== "Priest") return false;
      if (!filters.wizard && !filters.priest) return false;
    }

    if (!includesQuery(record, query)) return false;
    if (!includesAnySource(record.sources, filters.sources)) return false;
    if (filters.level && record.level !== filters.level) return false;
    if (filters.verbal && !record.components.verbal) return false;
    if (filters.somatic && !record.components.somatic) return false;
    if (filters.material && !record.components.material) return false;

    if (selectedTaxonomy.size > 0) {
      const values = [
        ...record.schools.map((school) => taxonomyValue("school", school)),
        ...record.spheres.map((sphere) => taxonomyValue("sphere", sphere))
      ];
      if (!values.some((value) => selectedTaxonomy.has(value))) {
        return false;
      }
    }

    return true;
  });
}

export function filterCreatures(records: CreatureRecord[], filters: BrowseFilters): CreatureRecord[] {
  const query = normalizeQuery(filters.search);
  return records.filter((record) => {
    if (!includesQuery(record, query)) return false;
    if (!includesAnySource(record.sources, filters.sources)) return false;
    if (filters.category && !record.categories.includes(filters.category)) return false;
    return true;
  });
}

export function filterItems(records: ItemRecord[], filters: BrowseFilters): ItemRecord[] {
  const query = normalizeQuery(filters.search);
  return records.filter((record) => {
    if (!includesQuery(record, query)) return false;
    if (!includesAnySource(record.sources, filters.sources)) return false;
    if (filters.primary && record.itemType !== filters.primary) return false;
    if (filters.category && !record.categories.includes(filters.category)) return false;
    return true;
  });
}

export function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim())))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

export function uniqueCategories(records: Array<{ categories: string[] }>): string[] {
  return uniqueSorted(records.flatMap((record) => record.categories));
}
