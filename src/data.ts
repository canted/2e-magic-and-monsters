import type { CreatureRecord, DataState, ItemRecord, SpellRecord, TabId } from "./types";

const DATA_FILES: Record<TabId, string> = {
  spells: "spells.json",
  creatures: "creatures.json",
  items: "items.json"
};

export async function loadTabData(tab: "spells"): Promise<SpellRecord[]>;
export async function loadTabData(tab: "creatures"): Promise<CreatureRecord[]>;
export async function loadTabData(tab: "items"): Promise<ItemRecord[]>;
export async function loadTabData(tab: TabId): Promise<SpellRecord[] | CreatureRecord[] | ItemRecord[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${DATA_FILES[tab]}`);
  if (!response.ok) {
    throw new Error(`Unable to load ${DATA_FILES[tab]} (${response.status})`);
  }
  return response.json();
}

export function initialDataState<T extends SpellRecord | CreatureRecord | ItemRecord>(): DataState<T> {
  return {
    status: "idle",
    records: []
  };
}
