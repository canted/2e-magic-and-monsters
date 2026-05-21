import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, Box, ChevronDown, Search, Shield, UsersRound } from "lucide-react";
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

const TABS: Array<{ id: TabId; label: string; icon: typeof BookOpen }> = [
  { id: "spells", label: "Spells", icon: BookOpen },
  { id: "creatures", label: "Monsters", icon: Shield },
  { id: "items", label: "Magic Items", icon: Box },
  { id: "classes", label: "Classes", icon: UsersRound }
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
