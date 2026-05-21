import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { ArrowUp, ChevronDown, Search } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Select, { createFilter, type MultiValue, type SingleValue } from "react-select";
import { initialDataState, loadTabData } from "./data";
import {
  filterClasses,
  filterCreatures,
  filterItems,
  filterSpells,
  taxonomyValue,
  uniqueCategories,
  uniqueSorted
} from "./filtering";
import type {
  BrowseFilters,
  ClassFilters,
  ClassRecord,
  CompendiumRecord,
  CreatureRecord,
  DataState,
  ItemRecord,
  SpellFilters,
  SpellRecord,
  TabId
} from "./types";

type TabIconProps = SVGProps<SVGSVGElement> & { size?: number };
type TabIcon = (props: TabIconProps) => JSX.Element;

function IconBase({ children, size = 18, ...props }: TabIconProps) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} {...props}>
      {children}
    </svg>
  );
}

function SpellsIcon(props: TabIconProps) {
  return (
    <IconBase {...props}>
      <path d="m12.593 23.258-.011.002-.071.035-.02.004-.014-.004-.071-.035q-.016-.005-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093q.019.005.029-.008l.004-.014-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z" />
      <path
        d="M18 2a2 2 0 0 1 2 2v12.99c0 .168-.038.322-.113.472l-.545 1.09a1 1 0 0 0 0 .895l.543 1.088A1 1 0 0 1 19 22H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm-.592 16H7a1 1 0 0 0-.117 1.993L7 20h10.408a3 3 0 0 1-.068-1.782zM18 4H7a1 1 0 0 0-.993.883L6 5v11.17q.377-.133.791-.163L7 16h11zm-4 3a1 1 0 0 1 .117 1.993L14 9h-4a1 1 0 0 1-.117-1.993L10 7z"
        fill="currentColor"
      />
    </IconBase>
  );
}

function MonstersIcon(props: TabIconProps) {
  return (
    <IconBase fillRule="evenodd" {...props}>
      <path d="m12.594 23.258-.012.002-.071.035-.02.004-.014-.004-.071-.036q-.016-.004-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092q.019.005.029-.008l.004-.014-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z" />
      <path
        d="M18.5 2a3.5 3.5 0 0 1 1.796 6.505A9 9 0 1 1 3 12c0-1.24.25-2.42.704-3.495a3.5 3.5 0 1 1 4.8-4.8A9 9 0 0 1 12 2.999c1.24 0 2.42.25 3.495.704A3.5 3.5 0 0 1 18.5 2M12 5a7 7 0 1 0 0 14a7 7 0 0 0 0-14m0 7a1.5 1.5 0 0 1 1.012 2.608a.5.5 0 0 0 .488.392a1 1 0 1 1 0 2a2.5 2.5 0 0 1-1.5-.5a2.5 2.5 0 0 1-1.5.5a1 1 0 1 1 0-2a.5.5 0 0 0 .488-.392A1.5 1.5 0 0 1 12 12M9 9a1 1 0 0 1 .993.883L10 10v1a1 1 0 0 1-1.993.117L8 11v-1a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1M5.5 4a1.5 1.5 0 0 0-.817 2.758a9 9 0 0 1 2.075-2.075A1.5 1.5 0 0 0 5.5 4m13 0a1.5 1.5 0 0 0-1.258.683a9 9 0 0 1 2.075 2.075A1.499 1.499 0 0 0 18.5 4"
        fill="currentColor"
      />
    </IconBase>
  );
}

function ItemsIcon(props: TabIconProps) {
  return (
    <IconBase fillRule="evenodd" {...props}>
      <path d="m12.593 23.258-.011.002-.071.035-.02.004-.014-.004-.071-.035q-.016-.005-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093q.019.005.029-.008l.004-.014-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z" />
      <path
        d="M6.751 5.343a1 1 0 0 0-1.414 1.414L7.458 8.88a1 1 0 0 0 1.414-1.415l-2.12-2.12Zm4.95 4.95a1 1 0 0 0-1.414 1.414l9.192 9.192a1 1 0 0 0 1.414-1.414zm4.95-4.95a1 1 0 0 1 0 1.414L14.529 8.88a1 1 0 1 1-1.414-1.415l2.121-2.12a1 1 0 0 1 1.415 0Zm-7.779 9.193a1 1 0 0 0-1.414-1.415l-2.121 2.122a1 1 0 1 0 1.414 1.414zM18.994 11a1 1 0 0 1-1 1h-3a1 1 0 1 1 0-2h3a1 1 0 0 1 1 1m-12 1a1 1 0 1 0 0-2h-3a1 1 0 1 0 0 2zm4 7a1 1 0 0 1-1-1v-3a1 1 0 1 1 2 0v3a1 1 0 0 1-1 1m-1-12a1 1 0 1 0 2 0V4a1 1 0 1 0-2 0z"
        fill="currentColor"
      />
    </IconBase>
  );
}

function ClassesIcon(props: TabIconProps) {
  return (
    <IconBase fillRule="evenodd" {...props}>
      <path d="m12.594 23.258-.012.002-.071.035-.02.004-.014-.004-.071-.036q-.016-.004-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092q.019.005.029-.008l.004-.014-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z" />
      <path
        d="M5 7.5a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0M9.5 5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5m0 8c1.993 0 3.805.608 5.137 1.466c.667.43 1.238.937 1.653 1.49c.407.545.71 1.2.71 1.901c0 .755-.35 1.36-.864 1.797c-.485.41-1.117.676-1.77.859c-1.313.367-3.05.487-4.866.487s-3.553-.12-4.865-.487c-.654-.183-1.286-.449-1.77-.859C2.349 19.218 2 18.612 2 17.857c0-.702.303-1.356.71-1.9c.415-.554.986-1.062 1.653-1.49C5.695 13.607 7.507 13 9.5 13m0 2c-1.597 0-3.035.492-4.055 1.148c-.51.328-.89.682-1.134 1.007c-.25.334-.311.576-.311.702c0 .074.015.15.157.27c.173.148.494.314 1.016.46c1.04.29 2.553.413 4.327.413s3.287-.123 4.327-.413c.522-.146.843-.312 1.016-.46c.142-.12.157-.196.157-.27c0-.126-.061-.368-.311-.702c-.244-.325-.624-.679-1.134-1.007C12.535 15.492 11.097 15 9.5 15m8.5-2c1.32 0 2.518.436 3.4 1.051c.822.573 1.6 1.477 1.6 2.52c0 .587-.253 1.073-.638 1.426c-.357.328-.809.528-1.244.66c-.87.263-1.99.343-3.118.343h-.203c.13-.348.203-.73.203-1.143q-.002-.336-.06-.65L17.893 17H18c1.081 0 1.96-.082 2.539-.257c.262-.08.397-.16.455-.206c-.029-.118-.185-.46-.738-.845a4 4 0 0 0-3.331-.546a7.5 7.5 0 0 0-1.684-1.48A6.06 6.06 0 0 1 18 13m-3-4a3 3 0 1 1 6 0a3 3 0 0 1-6 0m3-1a1 1 0 1 0 0 2a1 1 0 0 0 0-2"
        fill="currentColor"
      />
    </IconBase>
  );
}

const TABS: Array<{ id: TabId; label: string; icon: TabIcon }> = [
  { id: "spells", label: "Spells", icon: SpellsIcon },
  { id: "creatures", label: "Monsters", icon: MonstersIcon },
  { id: "items", label: "Magic Items", icon: ItemsIcon },
  { id: "classes", label: "Classes", icon: ClassesIcon }
];

const CORE_SOURCE_ORDER = ["PH", "DMG", "MM"];
const SPELL_SOURCE_DEFAULTS = ["PH", "MM"];
const MONSTER_SOURCE_DEFAULTS = ["MM"];
const ITEM_SOURCE_DEFAULTS = ["DMG"];
const CLASS_SOURCE_DEFAULTS = ["PH"];

const INITIAL_SPELL_FILTERS: SpellFilters = {
  wizard: true,
  priest: true,
  search: "",
  level: "",
  sources: SPELL_SOURCE_DEFAULTS,
  taxonomy: [],
  verbal: false,
  somatic: false,
  material: false
};

const INITIAL_BROWSE_FILTERS: BrowseFilters = {
  search: "",
  primary: "",
  sources: [],
  category: ""
};

interface SelectOption {
  label: string;
  value: string;
  metadata?: {
    selectedLabel?: string;
  };
}

const SOURCE_METADATA: Record<string, NonNullable<SelectOption["metadata"]> & { label: string }> = {
  PH: {
    label: "Player's Handbook",
    selectedLabel: "PH"
  },
  DMG: {
    label: "Dungeon Master's Guide",
    selectedLabel: "DMG"
  },
  MM: {
    label: "Monstrous Manual",
    selectedLabel: "MM"
  },
  POSM: {
    label: "Player's Option: Spells & Magic",
    selectedLabel: "POSM"
  },
  POSP: {
    label: "Player's Option: Skills & Powers",
    selectedLabel: "POSP"
  },
  POCT: {
    label: "Player's Option: Combat & Tactics",
    selectedLabel: "POCT"
  },
  CPsiH: {
    label: "The Complete Psionics Handbook",
    selectedLabel: "CPsiH"
  },
  VC: {
    label: "Vikings Campaign Sourcebook",
    selectedLabel: "VC"
  }
};

function sourceSortValue(value: string): [number, string] {
  const coreIndex = CORE_SOURCE_ORDER.indexOf(value);
  return [coreIndex === -1 ? CORE_SOURCE_ORDER.length : coreIndex, value];
}

function sourceLabel(value: string): string {
  return SOURCE_METADATA[value]?.label || value;
}

function sourceOptionsForRecords(records: Array<{ sources: string[] }>): SelectOption[] {
  return uniqueSorted(records.flatMap((record) => record.sources))
    .sort((a, b) => {
      const [rankA, valueA] = sourceSortValue(a);
      const [rankB, valueB] = sourceSortValue(b);
      if (rankA !== rankB) return rankA - rankB;
      return valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: "base" });
    })
    .map((source) => ({ label: sourceLabel(source), metadata: SOURCE_METADATA[source], value: source }));
}

function selectedOptions(options: SelectOption[], selectedValues: string[]): SelectOption[] {
  const selected = new Set(selectedValues);
  return options.filter((option) => selected.has(option.value));
}

function formatSourceOption(option: SelectOption, { context }: { context: "menu" | "value" }) {
  if (context === "value") {
    return option.metadata?.selectedLabel || option.label;
  }
  return option.label;
}

const sourceFilterOption = createFilter<SelectOption>({
  stringify: (option) => `${option.label} ${option.value} ${option.data.metadata?.selectedLabel || ""}`
});

interface AppUrlState {
  activeTab: TabId;
  spellFilters: SpellFilters;
  creatureFilters: BrowseFilters;
  itemFilters: BrowseFilters;
  classFilters: ClassFilters;
}

const INITIAL_CREATURE_FILTERS: BrowseFilters = {
  ...INITIAL_BROWSE_FILTERS,
  sources: MONSTER_SOURCE_DEFAULTS
};

const INITIAL_ITEM_FILTERS: BrowseFilters = {
  ...INITIAL_BROWSE_FILTERS,
  sources: ITEM_SOURCE_DEFAULTS
};

const INITIAL_CLASS_FILTERS: ClassFilters = {
  sources: CLASS_SOURCE_DEFAULTS,
  selectedClass: ""
};

function cloneSpellFilters(filters: SpellFilters): SpellFilters {
  return {
    ...filters,
    sources: [...filters.sources],
    taxonomy: [...filters.taxonomy]
  };
}

function cloneBrowseFilters(filters: BrowseFilters): BrowseFilters {
  return {
    ...filters,
    sources: [...filters.sources]
  };
}

function cloneClassFilters(filters: ClassFilters): ClassFilters {
  return {
    ...filters,
    sources: [...filters.sources]
  };
}

function appUrlDefaults(): AppUrlState {
  return {
    activeTab: "spells",
    spellFilters: cloneSpellFilters(INITIAL_SPELL_FILTERS),
    creatureFilters: cloneBrowseFilters(INITIAL_CREATURE_FILTERS),
    itemFilters: cloneBrowseFilters(INITIAL_ITEM_FILTERS),
    classFilters: cloneClassFilters(INITIAL_CLASS_FILTERS)
  };
}

function tabFromUrl(value: string | null): TabId {
  if (value === "monsters" || value === "creatures") return "creatures";
  if (value === "items" || value === "magic-items") return "items";
  if (value === "classes") return "classes";
  return "spells";
}

function tabToUrl(tab: TabId): string {
  if (tab === "creatures") return "monsters";
  if (tab === "items") return "items";
  if (tab === "classes") return "classes";
  return "spells";
}

function sourcesFromParams(params: URLSearchParams, defaults: string[]): string[] {
  if (params.get("allSources") === "1") return [];
  const values = params.getAll("source");
  return values.length > 0 ? values : [...defaults];
}

function appendSources(params: URLSearchParams, sources: string[]) {
  if (sources.length === 0) {
    params.set("allSources", "1");
    return;
  }
  sources.forEach((source) => params.append("source", source));
}

function spellFiltersFromParams(params: URLSearchParams): SpellFilters {
  const classFilter = params.get("class");
  return {
    ...cloneSpellFilters(INITIAL_SPELL_FILTERS),
    wizard: classFilter !== "priest",
    priest: classFilter !== "wizard",
    search: params.get("q") || "",
    level: params.get("level") || "",
    sources: sourcesFromParams(params, SPELL_SOURCE_DEFAULTS),
    taxonomy: params.getAll("tax"),
    verbal: params.getAll("component").includes("V"),
    somatic: params.getAll("component").includes("S"),
    material: params.getAll("component").includes("M")
  };
}

function browseFiltersFromParams(params: URLSearchParams, defaults: BrowseFilters, primaryKey?: string): BrowseFilters {
  return {
    ...cloneBrowseFilters(defaults),
    search: params.get("q") || "",
    primary: primaryKey ? params.get(primaryKey) || "" : "",
    sources: sourcesFromParams(params, defaults.sources),
    category: params.get("category") || ""
  };
}

function classFiltersFromParams(params: URLSearchParams): ClassFilters {
  return {
    ...cloneClassFilters(INITIAL_CLASS_FILTERS),
    sources: sourcesFromParams(params, CLASS_SOURCE_DEFAULTS),
    selectedClass: params.get("class") || ""
  };
}

function appUrlStateFromLocation(): AppUrlState {
  const params = new URLSearchParams(window.location.search);
  const activeTab = tabFromUrl(params.get("tab"));
  const state = appUrlDefaults();
  state.activeTab = activeTab;
  if (activeTab === "spells") {
    state.spellFilters = spellFiltersFromParams(params);
  } else if (activeTab === "creatures") {
    state.creatureFilters = browseFiltersFromParams(params, INITIAL_CREATURE_FILTERS);
  } else if (activeTab === "items") {
    state.itemFilters = browseFiltersFromParams(params, INITIAL_ITEM_FILTERS, "kind");
  } else {
    state.classFilters = classFiltersFromParams(params);
  }
  return state;
}

function serializeSpellFilters(params: URLSearchParams, filters: SpellFilters) {
  if (filters.search) params.set("q", filters.search);
  if (filters.wizard && !filters.priest) params.set("class", "wizard");
  if (filters.priest && !filters.wizard) params.set("class", "priest");
  if (filters.level) params.set("level", filters.level);
  appendSources(params, filters.sources);
  filters.taxonomy.forEach((value) => params.append("tax", value));
  if (filters.verbal) params.append("component", "V");
  if (filters.somatic) params.append("component", "S");
  if (filters.material) params.append("component", "M");
}

function serializeBrowseFilters(params: URLSearchParams, filters: BrowseFilters, primaryKey?: string) {
  if (filters.search) params.set("q", filters.search);
  appendSources(params, filters.sources);
  if (primaryKey && filters.primary) params.set(primaryKey, filters.primary);
  if (filters.category) params.set("category", filters.category);
}

function serializeClassFilters(params: URLSearchParams, filters: ClassFilters) {
  appendSources(params, filters.sources);
  if (filters.selectedClass) params.set("class", filters.selectedClass);
}

function urlForState(
  activeTab: TabId,
  spellFilters: SpellFilters,
  creatureFilters: BrowseFilters,
  itemFilters: BrowseFilters,
  classFilters: ClassFilters
) {
  const params = new URLSearchParams();
  params.set("tab", tabToUrl(activeTab));
  if (activeTab === "spells") {
    serializeSpellFilters(params, spellFilters);
  } else if (activeTab === "creatures") {
    serializeBrowseFilters(params, creatureFilters);
  } else if (activeTab === "items") {
    serializeBrowseFilters(params, itemFilters, "kind");
  } else {
    serializeClassFilters(params, classFilters);
  }
  return `${window.location.pathname}?${params.toString()}`;
}

function spellLevelSortValue(level: string): [number, number | string] {
  const lowered = level.toLocaleLowerCase();
  if (lowered === "cantrip") return [0, 0];
  if (lowered === "orison") return [0, 1];
  if (/^\d+$/.test(level)) return [1, Number(level)];
  if (lowered === "quest spell") return [2, 0];
  if (lowered === "special") return [3, 0];
  if (lowered === "true dweomer") return [4, 0];
  return [5, lowered];
}

function spellLevelOptions(records: SpellRecord[]): string[] {
  return uniqueSorted(records.map((record) => record.level)).sort((a, b) => {
    const [groupA, valueA] = spellLevelSortValue(a);
    const [groupB, valueB] = spellLevelSortValue(b);
    if (groupA !== groupB) return groupA - groupB;
    return typeof valueA === "number" && typeof valueB === "number"
      ? valueA - valueB
      : String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: "base" });
  });
}

function fieldEntries(fields: Record<string, string>, excluded = new Set<string>()): Array<[string, string]> {
  return Object.entries(fields).filter(([label, value]) => Boolean(value) && !excluded.has(label));
}

function componentsLabel(spell: SpellRecord): string {
  return [
    spell.components.verbal ? "V" : "",
    spell.components.somatic ? "S" : "",
    spell.components.material ? "M" : ""
  ]
    .filter(Boolean)
    .join("");
}

function badgesFor(record: CompendiumRecord): string[] {
  const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));
  if (record.kind === "spell") {
    return unique([record.level ? `L${record.level}` : "", record.spellClass]);
  }
  if (record.kind === "creature") {
    return unique([
      record.fields["Hit Dice"] ? `HD ${record.fields["Hit Dice"]}` : "",
      record.fields["Armor Class"] ? `AC ${record.fields["Armor Class"]}` : "",
      record.fields.Source
    ]);
  }
  if (record.kind === "item") {
    return unique([...record.itemKinds.slice(0, 2), record.fields.XP, record.fields.Value]);
  }
  return unique([record.fields.Group, record.fields.Source]);
}

function spellTaxonomyDetail(spell: SpellRecord): [string, string] {
  if (spell.spellClass === "Wizard" && spell.schools.length > 0) {
    return ["Schools", spell.schools.join(", ")];
  }
  if (spell.spellClass === "Priest" && spell.spheres.length > 0) {
    return ["Spheres", spell.spheres.join(", ")];
  }
  if (spell.schools.length > 0 && spell.spheres.length === 0) {
    return ["Schools", spell.schools.join(", ")];
  }
  if (spell.spheres.length > 0 && spell.schools.length === 0) {
    return ["Spheres", spell.spheres.join(", ")];
  }

  const values = [
    spell.schools.length > 0 ? `Schools: ${spell.schools.join(", ")}` : "",
    spell.spheres.length > 0 ? `Spheres: ${spell.spheres.join(", ")}` : ""
  ].filter(Boolean);
  return ["Schools / Spheres", values.join("; ") || "None"];
}

function DetailFooter({ record }: { record: CompendiumRecord }) {
  const source = record.fields.Source;
  const hasCategories = record.categories.length > 0;
  if (!source && !hasCategories) return null;

  return (
    <footer className="detail-footer">
      {source ? (
        <div>
          <span>Source</span>
          <p>{source}</p>
        </div>
      ) : null}
      {hasCategories ? (
        <div>
          <span>Categories</span>
          <p>{record.categories.join(", ")}</p>
        </div>
      ) : null}
    </footer>
  );
}

function ResultDetail({ record }: { record: CompendiumRecord }) {
  const detailFields = fieldEntries(record.fields, record.kind === "spell" ? new Set(["Source"]) : undefined);
  const spellTaxonomy = record.kind === "spell" ? spellTaxonomyDetail(record) : null;

  return (
    <div className="result-detail">
      <dl className="detail-grid">
        {detailFields.map(([label, value]) => (
          <div className="detail-field" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {record.kind === "spell" ? (
          <>
            <div className="detail-field">
              <dt>Class</dt>
              <dd>{record.spellClass}</dd>
            </div>
            <div className="detail-field">
              <dt>Level</dt>
              <dd>{record.level || "Unlisted"}</dd>
            </div>
            <div className="detail-field">
              <dt>{spellTaxonomy?.[0]}</dt>
              <dd>{spellTaxonomy?.[1]}</dd>
            </div>
            <div className="detail-field">
              <dt>Components</dt>
              <dd>{componentsLabel(record) || "None"}</dd>
            </div>
          </>
        ) : null}
        {record.kind !== "spell" && record.categories.length > 0 ? (
          <div className="detail-field detail-field-wide">
            <dt>Categories</dt>
            <dd>{record.categories.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      <article className="wiki-body" dangerouslySetInnerHTML={{ __html: record.bodyHtml }} />
      {record.kind === "spell" ? <DetailFooter record={record} /> : null}
    </div>
  );
}

function ResultRow({
  record,
  expanded,
  onToggle
}: {
  record: CompendiumRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={`result-row ${expanded ? "is-expanded" : ""}`}>
      <button className="result-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span className="result-title">{record.name}</span>
        <span className="result-badges" aria-hidden="true">
          {badgesFor(record).map((badge, index) => (
            <span className="badge" key={`${record.id}-${index}-${badge}`}>
              {badge}
            </span>
          ))}
          <ChevronDown className="chevron" size={18} />
        </span>
      </button>
      {expanded ? <ResultDetail record={record} /> : null}
    </section>
  );
}

function VirtualResults({
  records,
  expandedId,
  setExpandedId
}: {
  records: CompendiumRecord[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  if (records.length === 0) {
    return <div className="empty-state">No matching records.</div>;
  }

  if (records.length <= 40) {
    return (
      <div className="result-list">
        {records.map((record) => {
          const expanded = expandedId === record.id;
          return (
            <ResultRow
              expanded={expanded}
              key={record.id}
              onToggle={() => setExpandedId(expanded ? null : record.id)}
              record={record}
            />
          );
        })}
      </div>
    );
  }

  return <WindowedResults expandedId={expandedId} records={records} setExpandedId={setExpandedId} />;
}

function WindowedResults({
  records,
  expandedId,
  setExpandedId
}: {
  records: CompendiumRecord[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtualizer = useWindowVirtualizer({
    count: records.length,
    estimateSize: () => 72,
    initialRect: { height: 640, width: 1024 },
    overscan: 8,
    scrollMargin
  });

  useLayoutEffect(() => {
    const node = parentRef.current;
    if (!node) return;
    const nextScrollMargin = node.getBoundingClientRect().top + window.scrollY;
    setScrollMargin((current) => (Math.abs(current - nextScrollMargin) < 1 ? current : nextScrollMargin));
  });

  useEffect(() => {
    const updateScrollMargin = () => {
      const node = parentRef.current;
      if (!node) return;
      const nextScrollMargin = node.getBoundingClientRect().top + window.scrollY;
      setScrollMargin((current) => (Math.abs(current - nextScrollMargin) < 1 ? current : nextScrollMargin));
    };
    updateScrollMargin();
    window.addEventListener("resize", updateScrollMargin);
    return () => window.removeEventListener("resize", updateScrollMargin);
  }, []);

  useEffect(() => {
    virtualizer.measure();
  }, [expandedId, records.length, scrollMargin, virtualizer]);

  return (
    <div className="result-scroll" ref={parentRef} data-testid="result-scroll">
      <div className="result-spacer" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const record = records[virtualRow.index];
          const expanded = expandedId === record.id;
          return (
            <div
              className="virtual-row"
              data-index={virtualRow.index}
              key={record.id}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
            >
              <ResultRow
                record={record}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : record.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpellControls({
  filters,
  setFilters,
  records
}: {
  filters: SpellFilters;
  setFilters: (filters: SpellFilters) => void;
  records: SpellRecord[];
}) {
  const levelRecords = useMemo(() => filterSpells(records, { ...filters, level: "" }), [filters, records]);
  const taxonomyRecords = useMemo(() => filterSpells(records, { ...filters, taxonomy: [] }), [filters, records]);
  const sourceRecords = useMemo(() => filterSpells(records, { ...filters, sources: [] }), [filters, records]);
  const levels = useMemo(() => spellLevelOptions(levelRecords), [levelRecords]);
  const schools = useMemo(() => uniqueSorted(taxonomyRecords.flatMap((record) => record.schools)), [taxonomyRecords]);
  const spheres = useMemo(() => uniqueSorted(taxonomyRecords.flatMap((record) => record.spheres)), [taxonomyRecords]);
  const sourceOptions = useMemo(() => sourceOptionsForRecords(sourceRecords), [sourceRecords]);
  const taxonomyOptions = useMemo(
    () => [
      {
        label: "Schools",
        options: schools.map((school) => ({ label: school, value: taxonomyValue("school", school) }))
      },
      {
        label: "Spheres",
        options: spheres.map((sphere) => ({ label: sphere, value: taxonomyValue("sphere", sphere) }))
      }
    ],
    [schools, spheres]
  );
  const selectedTaxonomy = useMemo(() => {
    const selected = new Set(filters.taxonomy);
    return taxonomyOptions.flatMap((group) => group.options).filter((option) => selected.has(option.value));
  }, [filters.taxonomy, taxonomyOptions]);
  const selectedSources = useMemo(() => selectedOptions(sourceOptions, filters.sources), [filters.sources, sourceOptions]);

  useEffect(() => {
    if (records.length === 0) return;
    const validLevels = new Set(levels);
    const validSources = new Set(sourceOptions.map((option) => option.value));
    const validTaxonomy = new Set(taxonomyOptions.flatMap((group) => group.options.map((option) => option.value)));
    const taxonomy = filters.taxonomy.filter((value) => validTaxonomy.has(value));
    const level = filters.level && !validLevels.has(filters.level) ? "" : filters.level;
    const sources =
      sourceOptions.length > 0 ? filters.sources.filter((source) => validSources.has(source)) : filters.sources;
    if (level !== filters.level || taxonomy.length !== filters.taxonomy.length || sources.length !== filters.sources.length) {
      setFilters({ ...filters, level, sources, taxonomy });
    }
  }, [filters, levels, records.length, setFilters, sourceOptions, taxonomyOptions]);

  const update = (patch: Partial<SpellFilters>) => setFilters({ ...filters, ...patch });
  const updateClass = (key: "wizard" | "priest", checked: boolean) => {
    const next = { ...filters, [key]: checked };
    if (!next.wizard && !next.priest) {
      next[key === "wizard" ? "priest" : "wizard"] = true;
    }
    setFilters(next);
  };

  return (
    <form className="filter-bar" role="search">
      <fieldset className="checkbox-group compact">
        <legend>Class</legend>
        <label>
          <input
            checked={filters.wizard}
            onChange={(event) => updateClass("wizard", event.currentTarget.checked)}
            type="checkbox"
          />
          Wizard
        </label>
        <label>
          <input
            checked={filters.priest}
            onChange={(event) => updateClass("priest", event.currentTarget.checked)}
            type="checkbox"
          />
          Priest
        </label>
      </fieldset>

      <label className="field search-field">
        <span>Search</span>
        <span className="search-input">
          <Search size={17} />
          <input
            aria-label="Search spells"
            onChange={(event) => update({ search: event.currentTarget.value })}
            placeholder="Name or description"
            value={filters.search}
          />
        </span>
      </label>

      <label className="field level-field">
        <span>Level</span>
        <select value={filters.level} onChange={(event) => update({ level: event.currentTarget.value })}>
          <option value="">All</option>
          {levels.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      <label className="field taxonomy-field" htmlFor="taxonomy-select">
        <span>Schools / Spheres</span>
        <Select<SelectOption, true>
          aria-label="Schools and spheres"
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          closeMenuOnSelect={false}
          inputId="taxonomy-select"
          isClearable
          isMulti
          onChange={(value: MultiValue<SelectOption>) =>
            update({
              taxonomy: value.map((option) => option.value)
            })
          }
          options={taxonomyOptions}
          placeholder="All schools and spheres"
          value={selectedTaxonomy}
        />
      </label>

      <label className="field source-field" htmlFor="spell-source-select">
        <span>Source</span>
        <Select<SelectOption, true>
          aria-label="Spell sources"
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          inputId="spell-source-select"
          isClearable
          isMulti
          onChange={(value: MultiValue<SelectOption>) =>
            update({
              sources: value.map((option) => option.value)
            })
          }
          options={sourceOptions}
          placeholder="All sources"
          filterOption={sourceFilterOption}
          formatOptionLabel={formatSourceOption}
          value={selectedSources}
        />
      </label>

      <fieldset className="checkbox-group compact components">
        <legend>Components</legend>
        <label>
          <input
            checked={filters.verbal}
            onChange={(event) => update({ verbal: event.currentTarget.checked })}
            type="checkbox"
          />
          V
        </label>
        <label>
          <input
            checked={filters.somatic}
            onChange={(event) => update({ somatic: event.currentTarget.checked })}
            type="checkbox"
          />
          S
        </label>
        <label>
          <input
            checked={filters.material}
            onChange={(event) => update({ material: event.currentTarget.checked })}
            type="checkbox"
          />
          M
        </label>
      </fieldset>
    </form>
  );
}

function BrowseControls({
  label,
  primaryLabel,
  primaryOptions,
  categoryOptions,
  sourceOptions,
  filters,
  setFilters
}: {
  label: string;
  primaryLabel?: string;
  primaryOptions?: string[];
  categoryOptions?: string[];
  sourceOptions: SelectOption[];
  filters: BrowseFilters;
  setFilters: (filters: BrowseFilters) => void;
}) {
  const update = (patch: Partial<BrowseFilters>) => setFilters({ ...filters, ...patch });
  const selectedSources = useMemo(() => selectedOptions(sourceOptions, filters.sources), [filters.sources, sourceOptions]);
  const sourceInputId = `${label.replace(/\s+/g, "-")}-source-select`;

  useEffect(() => {
    const validPrimary = new Set(primaryOptions || []);
    const validCategories = new Set(categoryOptions || []);
    const validSources = new Set(sourceOptions.map((option) => option.value));
    const primary =
      primaryOptions && primaryOptions.length > 0 && filters.primary && !validPrimary.has(filters.primary)
        ? ""
        : filters.primary;
    const category =
      categoryOptions && categoryOptions.length > 0 && filters.category && !validCategories.has(filters.category)
        ? ""
        : filters.category;
    const sources =
      sourceOptions.length > 0 ? filters.sources.filter((source) => validSources.has(source)) : filters.sources;
    if (primary !== filters.primary || category !== filters.category || sources.length !== filters.sources.length) {
      setFilters({ ...filters, primary, category, sources });
    }
  }, [categoryOptions, filters, primaryOptions, setFilters, sourceOptions]);

  return (
    <form className="filter-bar browse-filter-bar" role="search">
      <label className="field search-field">
        <span>Search</span>
        <span className="search-input">
          <Search size={17} />
          <input
            aria-label={`Search ${label}`}
            onChange={(event) => update({ search: event.currentTarget.value })}
            placeholder="Name or description"
            value={filters.search}
          />
        </span>
      </label>

      <label className="field source-field" htmlFor={sourceInputId}>
        <span>Source</span>
        <Select<SelectOption, true>
          aria-label={`${label} sources`}
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          inputId={sourceInputId}
          isClearable
          isMulti
          onChange={(value: MultiValue<SelectOption>) =>
            update({
              sources: value.map((option) => option.value)
            })
          }
          options={sourceOptions}
          placeholder="All sources"
          filterOption={sourceFilterOption}
          formatOptionLabel={formatSourceOption}
          value={selectedSources}
        />
      </label>

      {primaryLabel && primaryOptions ? (
        <label className="field">
          <span>{primaryLabel}</span>
          <select
            aria-label={`${label} ${primaryLabel.toLocaleLowerCase()}`}
            value={filters.primary}
            onChange={(event) => update({ primary: event.currentTarget.value })}
          >
            <option value="">All</option>
            {primaryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {categoryOptions ? (
        <label className="field">
          <span>Category</span>
          <select
            aria-label={`${label} category`}
            value={filters.category}
            onChange={(event) => update({ category: event.currentTarget.value })}
          >
            <option value="">All</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </form>
  );
}

function classOptionsForRecords(records: ClassRecord[]): SelectOption[] {
  const nameCounts = records.reduce((counts, record) => {
    const key = record.name.toLocaleLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map<string, number>());

  return records.map((record) => {
    const duplicatedName = (nameCounts.get(record.name.toLocaleLowerCase()) || 0) > 1;
    const sourceNames = record.sources.map(sourceLabel).join(", ");
    return {
      label: duplicatedName ? `${record.name} - ${sourceNames}` : record.name,
      value: record.id
    };
  });
}

function ClassControls({
  filters,
  setFilters,
  records
}: {
  filters: ClassFilters;
  setFilters: (filters: ClassFilters) => void;
  records: ClassRecord[];
}) {
  const update = (patch: Partial<ClassFilters>) => setFilters({ ...filters, ...patch });
  const sourceOptions = useMemo(() => sourceOptionsForRecords(records), [records]);
  const selectedSources = useMemo(() => selectedOptions(sourceOptions, filters.sources), [filters.sources, sourceOptions]);
  const filteredClasses = useMemo(() => filterClasses(records, filters), [filters, records]);
  const classOptions = useMemo(() => classOptionsForRecords(filteredClasses), [filteredClasses]);
  const selectedClass = useMemo(
    () => classOptions.find((option) => option.value === filters.selectedClass) || null,
    [classOptions, filters.selectedClass]
  );

  useEffect(() => {
    if (records.length === 0) return;
    const validSources = new Set(sourceOptions.map((option) => option.value));
    const sources =
      sourceOptions.length > 0 ? filters.sources.filter((source) => validSources.has(source)) : filters.sources;
    const validClasses = new Set(classOptions.map((option) => option.value));
    const selectedClass =
      filters.selectedClass && validClasses.has(filters.selectedClass)
        ? filters.selectedClass
        : classOptions[0]?.value || "";

    if (sources.length !== filters.sources.length || selectedClass !== filters.selectedClass) {
      setFilters({ ...filters, selectedClass, sources });
    }
  }, [classOptions, filters, records.length, setFilters, sourceOptions]);

  return (
    <form className="filter-bar class-filter-bar" role="search">
      <label className="field source-field" htmlFor="class-source-select">
        <span>Source</span>
        <Select<SelectOption, true>
          aria-label="class sources"
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          closeMenuOnSelect={false}
          hideSelectedOptions={false}
          inputId="class-source-select"
          isClearable
          isMulti
          onChange={(value: MultiValue<SelectOption>) =>
            update({
              sources: value.map((option) => option.value)
            })
          }
          options={sourceOptions}
          placeholder="All sources"
          filterOption={sourceFilterOption}
          formatOptionLabel={formatSourceOption}
          value={selectedSources}
        />
      </label>

      <label className="field class-select-field" htmlFor="class-select">
        <span>Class</span>
        <Select<SelectOption, false>
          aria-label="Select class"
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          inputId="class-select"
          isClearable={false}
          onChange={(value: SingleValue<SelectOption>) => update({ selectedClass: value?.value || "" })}
          options={classOptions}
          placeholder="Choose a class"
          value={selectedClass}
        />
      </label>
    </form>
  );
}

function ClassReference({
  record,
  loading
}: {
  record: ClassRecord | undefined;
  loading: boolean;
}) {
  if (loading) {
    return <div className="empty-state">Loading...</div>;
  }

  if (!record) {
    return <div className="empty-state">No class selected.</div>;
  }

  return (
    <article className="class-reference">
      <header className="class-reference-header">
        <div>
          <p>Class Reference</p>
          <h1>{record.name}</h1>
        </div>
        <span className="result-badges" aria-hidden="true">
          {record.sources.map((source) => (
            <span className="badge" key={source}>
              {SOURCE_METADATA[source]?.selectedLabel || source}
            </span>
          ))}
          {record.fields.Group ? <span className="badge">{record.fields.Group}</span> : null}
        </span>
      </header>

      <dl className="detail-grid class-detail-grid">
        {fieldEntries(record.fields).map(([label, value]) => (
          <div className="detail-field" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {record.progressionHtml ? (
        <section className="class-progression" dangerouslySetInnerHTML={{ __html: record.progressionHtml }} />
      ) : (
        <div className="empty-state class-empty-state">No progression table found for this class source.</div>
      )}

      <article className="wiki-body class-body" dangerouslySetInnerHTML={{ __html: record.bodyHtml }} />
      <DetailFooter record={record} />
    </article>
  );
}

function StatusLine({
  activeTab,
  total,
  visible,
  loading
}: {
  activeTab: TabId;
  total: number;
  visible: number;
  loading: boolean;
}) {
  const noun =
    activeTab === "spells"
      ? "spells"
      : activeTab === "creatures"
        ? "monsters"
        : activeTab === "items"
          ? "magic items"
          : "classes";
  return (
    <div className="status-line" aria-live="polite">
      {loading ? "Loading..." : `${visible.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
    </div>
  );
}

export default function App() {
  const [initialUrlState] = useState(appUrlStateFromLocation);
  const [activeTab, setActiveTab] = useState<TabId>(initialUrlState.activeTab);
  const [spells, setSpells] = useState<DataState<SpellRecord>>(initialDataState());
  const [creatures, setCreatures] = useState<DataState<CreatureRecord>>(initialDataState());
  const [items, setItems] = useState<DataState<ItemRecord>>(initialDataState());
  const [classes, setClasses] = useState<DataState<ClassRecord>>(initialDataState());
  const [spellFilters, setSpellFilters] = useState<SpellFilters>(initialUrlState.spellFilters);
  const [creatureFilters, setCreatureFilters] = useState<BrowseFilters>(initialUrlState.creatureFilters);
  const [itemFilters, setItemFilters] = useState<BrowseFilters>(initialUrlState.itemFilters);
  const [classFilters, setClassFilters] = useState<ClassFilters>(initialUrlState.classFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const scrollTopRef = useRef<HTMLButtonElement | null>(null);
  const hasSyncedUrlRef = useRef(false);

  useEffect(() => {
    setExpandedId(null);
  }, [activeTab]);

  useEffect(() => {
    const applyCurrentUrl = () => {
      const nextState = appUrlStateFromLocation();
      setActiveTab(nextState.activeTab);
      if (nextState.activeTab === "spells") {
        setSpellFilters(nextState.spellFilters);
      } else if (nextState.activeTab === "creatures") {
        setCreatureFilters(nextState.creatureFilters);
      } else if (nextState.activeTab === "items") {
        setItemFilters(nextState.itemFilters);
      } else {
        setClassFilters(nextState.classFilters);
      }
    };
    window.addEventListener("popstate", applyCurrentUrl);
    return () => window.removeEventListener("popstate", applyCurrentUrl);
  }, []);

  useEffect(() => {
    const nextUrl = urlForState(activeTab, spellFilters, creatureFilters, itemFilters, classFilters);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (!hasSyncedUrlRef.current) {
      hasSyncedUrlRef.current = true;
      if (currentUrl !== nextUrl) {
        window.history.replaceState(null, "", nextUrl);
      }
      return;
    }
    if (currentUrl !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  }, [activeTab, classFilters, creatureFilters, itemFilters, spellFilters]);

  useEffect(() => {
    const updateScrollTopVisibility = () => {
      const node = controlsRef.current;
      scrollTopRef.current?.classList.toggle("is-visible", Boolean(node && node.getBoundingClientRect().bottom < 0));
    };
    const scrollOptions = { capture: true, passive: true };
    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, scrollOptions);
    document.addEventListener("scroll", updateScrollTopVisibility, scrollOptions);
    window.addEventListener("resize", updateScrollTopVisibility);
    const pollId = window.setInterval(updateScrollTopVisibility, 250);
    return () => {
      window.removeEventListener("scroll", updateScrollTopVisibility, scrollOptions);
      document.removeEventListener("scroll", updateScrollTopVisibility, scrollOptions);
      window.removeEventListener("resize", updateScrollTopVisibility);
      window.clearInterval(pollId);
      scrollTopRef.current?.classList.remove("is-visible");
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "spells" && spells.status === "idle") {
      setSpells({ status: "loading", records: [] });
      loadTabData("spells")
        .then((records) => setSpells({ status: "ready", records }))
        .catch((error: Error) => setSpells({ status: "error", records: [], error: error.message }));
    }
    if (activeTab === "creatures" && creatures.status === "idle") {
      setCreatures({ status: "loading", records: [] });
      loadTabData("creatures")
        .then((records) => setCreatures({ status: "ready", records }))
        .catch((error: Error) => setCreatures({ status: "error", records: [], error: error.message }));
    }
    if (activeTab === "items" && items.status === "idle") {
      setItems({ status: "loading", records: [] });
      loadTabData("items")
        .then((records) => setItems({ status: "ready", records }))
        .catch((error: Error) => setItems({ status: "error", records: [], error: error.message }));
    }
    if (activeTab === "classes" && classes.status === "idle") {
      setClasses({ status: "loading", records: [] });
      loadTabData("classes")
        .then((records) => setClasses({ status: "ready", records }))
        .catch((error: Error) => setClasses({ status: "error", records: [], error: error.message }));
    }
  }, [activeTab, classes.status, creatures.status, items.status, spells.status]);

  const deferredSpellFilters = {
    ...spellFilters,
    search: useDeferredValue(spellFilters.search)
  };
  const deferredCreatureFilters = {
    ...creatureFilters,
    search: useDeferredValue(creatureFilters.search)
  };
  const deferredItemFilters = {
    ...itemFilters,
    search: useDeferredValue(itemFilters.search)
  };

  const visibleSpells = useMemo(
    () => filterSpells(spells.records, deferredSpellFilters),
    [deferredSpellFilters, spells.records]
  );
  const visibleCreatures = useMemo(
    () => filterCreatures(creatures.records, deferredCreatureFilters),
    [creatures.records, deferredCreatureFilters]
  );
  const visibleItems = useMemo(
    () => filterItems(items.records, deferredItemFilters),
    [deferredItemFilters, items.records]
  );
  const visibleClasses = useMemo(() => filterClasses(classes.records, classFilters), [classes.records, classFilters]);
  const selectedClassRecord = useMemo(
    () => visibleClasses.find((record) => record.id === classFilters.selectedClass) || visibleClasses[0],
    [classFilters.selectedClass, visibleClasses]
  );

  const creatureSourceRecords = useMemo(
    () => filterCreatures(creatures.records, { ...deferredCreatureFilters, sources: [] }),
    [creatures.records, deferredCreatureFilters]
  );
  const creatureCategoryRecords = useMemo(
    () => filterCreatures(creatures.records, { ...deferredCreatureFilters, category: "" }),
    [creatures.records, deferredCreatureFilters]
  );
  const creatureSources = useMemo(
    () => sourceOptionsForRecords(creatureSourceRecords),
    [creatureSourceRecords]
  );
  const creatureCategories = useMemo(() => uniqueCategories(creatureCategoryRecords), [creatureCategoryRecords]);

  const itemSourceRecords = useMemo(
    () => filterItems(items.records, { ...deferredItemFilters, sources: [] }),
    [deferredItemFilters, items.records]
  );
  const itemKindRecords = useMemo(
    () => filterItems(items.records, { ...deferredItemFilters, primary: "" }),
    [deferredItemFilters, items.records]
  );
  const itemKinds = useMemo(
    () => uniqueSorted(itemKindRecords.flatMap((record) => record.itemKinds)),
    [itemKindRecords]
  );
  const itemSources = useMemo(
    () => sourceOptionsForRecords(itemSourceRecords),
    [itemSourceRecords]
  );

  const activeState =
    activeTab === "spells" ? spells : activeTab === "creatures" ? creatures : activeTab === "items" ? items : classes;
  const activeRecords =
    activeTab === "spells"
      ? visibleSpells
      : activeTab === "creatures"
        ? visibleCreatures
        : activeTab === "items"
          ? visibleItems
          : visibleClasses;
  const totalCount =
    activeTab === "spells"
      ? spells.records.length
      : activeTab === "creatures"
        ? creatures.records.length
        : activeTab === "items"
          ? items.records.length
          : classes.records.length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <nav className="tabs" aria-label="Content sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={activeTab === tab.id ? "tab is-active" : "tab"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
        <StatusLine
          activeTab={activeTab}
          loading={activeState.status === "loading"}
          total={totalCount}
          visible={activeRecords.length}
        />
      </header>

      <section className="controls-region" ref={controlsRef}>
        {activeTab === "spells" ? (
          <SpellControls filters={spellFilters} records={spells.records} setFilters={setSpellFilters} />
        ) : null}
        {activeTab === "creatures" ? (
          <BrowseControls
            categoryOptions={creatureCategories}
            filters={creatureFilters}
            label="monsters"
            setFilters={setCreatureFilters}
            sourceOptions={creatureSources}
          />
        ) : null}
        {activeTab === "items" ? (
          <BrowseControls
            filters={itemFilters}
            label="magic items"
            primaryLabel="Kind"
            primaryOptions={itemKinds}
            setFilters={setItemFilters}
            sourceOptions={itemSources}
          />
        ) : null}
        {activeTab === "classes" ? (
          <ClassControls filters={classFilters} records={classes.records} setFilters={setClassFilters} />
        ) : null}
      </section>

      <section className="results-region" aria-label="Results">
        {activeState.status === "error" ? <div className="empty-state">Unable to load data: {activeState.error}</div> : null}
        {activeState.status !== "error" && activeTab !== "classes" ? (
          <VirtualResults expandedId={expandedId} records={activeRecords} setExpandedId={setExpandedId} />
        ) : null}
        {activeState.status !== "error" && activeTab === "classes" ? (
          <ClassReference loading={classes.status === "loading"} record={selectedClassRecord} />
        ) : null}
      </section>

      <button
        aria-label="Scroll to filters"
        className="scroll-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        ref={scrollTopRef}
        title="Scroll to filters"
        type="button"
      >
        <ArrowUp size={19} />
      </button>
    </main>
  );
}
