export type TabId = "spells" | "creatures" | "items";

export type FieldMap = Record<string, string>;

export interface BaseRecord {
  id: string;
  kind: string;
  title: string;
  name: string;
  fields: FieldMap;
  sources: string[];
  categories: string[];
  bodyHtml: string;
  bodyText: string;
  searchText: string;
}

export interface SpellRecord extends BaseRecord {
  kind: "spell";
  spellClass: "Wizard" | "Priest" | "Other" | string;
  level: string;
  schools: string[];
  spheres: string[];
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
  };
}

export interface CreatureRecord extends BaseRecord {
  kind: "creature";
}

export interface ItemRecord extends BaseRecord {
  kind: "item";
  itemType: string;
  itemKinds: string[];
}

export type CompendiumRecord = SpellRecord | CreatureRecord | ItemRecord;

export interface SpellFilters {
  wizard: boolean;
  priest: boolean;
  search: string;
  level: string;
  sources: string[];
  taxonomy: string[];
  verbal: boolean;
  somatic: boolean;
  material: boolean;
}

export interface BrowseFilters {
  search: string;
  primary: string;
  sources: string[];
  category: string;
}

export interface DataState<T extends CompendiumRecord> {
  status: "idle" | "loading" | "ready" | "error";
  records: T[];
  error?: string;
}
