import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, BookOpen, Box, ChevronDown, Search, Shield } from "lucide-react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Select, { type MultiValue } from "react-select";
import { initialDataState, loadTabData } from "./data";
import {
  filterCreatures,
  filterItems,
  filterSpells,
  taxonomyValue,
  uniqueCategories,
  uniqueSorted
} from "./filtering";
import type {
  BrowseFilters,
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
  { id: "items", label: "Magic Items", icon: Box }
];

const CORE_SOURCE_DEFAULTS = ["PH", "DMG", "MM"];

const INITIAL_SPELL_FILTERS: SpellFilters = {
  wizard: true,
  priest: true,
  search: "",
  level: "",
  sources: CORE_SOURCE_DEFAULTS,
  taxonomy: [],
  verbal: false,
  somatic: false,
  material: false
};

const INITIAL_BROWSE_FILTERS: BrowseFilters = {
  search: "",
  primary: "",
  sources: CORE_SOURCE_DEFAULTS,
  category: ""
};

interface SelectOption {
  label: string;
  value: string;
}

function sourceSortValue(value: string): [number, string] {
  const coreIndex = CORE_SOURCE_DEFAULTS.indexOf(value);
  return [coreIndex === -1 ? CORE_SOURCE_DEFAULTS.length : coreIndex, value];
}

function sourceOptionsForRecords(records: CompendiumRecord[]): SelectOption[] {
  return uniqueSorted([...CORE_SOURCE_DEFAULTS, ...records.flatMap((record) => record.sources)]).sort((a, b) => {
    const [rankA, valueA] = sourceSortValue(a);
    const [rankB, valueB] = sourceSortValue(b);
    if (rankA !== rankB) return rankA - rankB;
    return valueA.localeCompare(valueB, undefined, { numeric: true, sensitivity: "base" });
  }).map((source) => ({ label: source, value: source }));
}

function selectedOptions(options: SelectOption[], selectedValues: string[]): SelectOption[] {
  const selected = new Set(selectedValues);
  return options.filter((option) => selected.has(option.value));
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

function fieldEntries(fields: Record<string, string>): Array<[string, string]> {
  return Object.entries(fields).filter(([, value]) => Boolean(value));
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
    return unique([
      record.level ? `L${record.level}` : "",
      record.spellClass,
      ...record.schools.slice(0, 2),
      ...record.spheres.slice(0, 2),
      componentsLabel(record)
    ]);
  }
  if (record.kind === "creature") {
    return unique([
      record.fields["Hit Dice"] ? `HD ${record.fields["Hit Dice"]}` : "",
      record.fields["Armor Class"] ? `AC ${record.fields["Armor Class"]}` : "",
      record.fields.Source
    ]);
  }
  return unique([record.itemType, record.fields.XP, record.fields.Value]);
}

function ResultDetail({ record }: { record: CompendiumRecord }) {
  return (
    <div className="result-detail">
      <dl className="detail-grid">
        {fieldEntries(record.fields).map(([label, value]) => (
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
              <dt>Schools</dt>
              <dd>{record.schools.join(", ") || "None"}</dd>
            </div>
            <div className="detail-field">
              <dt>Spheres</dt>
              <dd>{record.spheres.join(", ") || "None"}</dd>
            </div>
            <div className="detail-field">
              <dt>Components</dt>
              <dd>{componentsLabel(record) || "None"}</dd>
            </div>
          </>
        ) : null}
        {record.categories.length > 0 ? (
          <div className="detail-field detail-field-wide">
            <dt>Categories</dt>
            <dd>{record.categories.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      <article className="wiki-body" dangerouslySetInnerHTML={{ __html: record.bodyHtml }} />
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
          {badgesFor(record).map((badge) => (
            <span className="badge" key={`${record.id}-${badge}`}>
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
  const levels = useMemo(() => spellLevelOptions(records), [records]);
  const schools = useMemo(() => uniqueSorted(records.flatMap((record) => record.schools)), [records]);
  const spheres = useMemo(() => uniqueSorted(records.flatMap((record) => record.spheres)), [records]);
  const sourceOptions = useMemo(() => sourceOptionsForRecords(records), [records]);
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

  const update = (patch: Partial<SpellFilters>) => setFilters({ ...filters, ...patch });

  return (
    <form className="filter-bar" role="search">
      <fieldset className="checkbox-group compact">
        <legend>Class</legend>
        <label>
          <input
            checked={filters.wizard}
            onChange={(event) => update({ wizard: event.currentTarget.checked })}
            type="checkbox"
          />
          Wizard
        </label>
        <label>
          <input
            checked={filters.priest}
            onChange={(event) => update({ priest: event.currentTarget.checked })}
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
  categoryOptions: string[];
  sourceOptions: SelectOption[];
  filters: BrowseFilters;
  setFilters: (filters: BrowseFilters) => void;
}) {
  const update = (patch: Partial<BrowseFilters>) => setFilters({ ...filters, ...patch });
  const selectedSources = useMemo(() => selectedOptions(sourceOptions, filters.sources), [filters.sources, sourceOptions]);
  const sourceInputId = `${label.replace(/\s+/g, "-")}-source-select`;
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
          value={selectedSources}
        />
      </label>

      {primaryLabel && primaryOptions ? (
        <label className="field">
          <span>{primaryLabel}</span>
          <select value={filters.primary} onChange={(event) => update({ primary: event.currentTarget.value })}>
            <option value="">All</option>
            {primaryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>Category</span>
        <select value={filters.category} onChange={(event) => update({ category: event.currentTarget.value })}>
          <option value="">All</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </form>
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
  const noun = activeTab === "spells" ? "spells" : activeTab === "creatures" ? "monsters" : "magic items";
  return (
    <div className="status-line" aria-live="polite">
      {loading ? "Loading..." : `${visible.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("spells");
  const [spells, setSpells] = useState<DataState<SpellRecord>>(initialDataState());
  const [creatures, setCreatures] = useState<DataState<CreatureRecord>>(initialDataState());
  const [items, setItems] = useState<DataState<ItemRecord>>(initialDataState());
  const [spellFilters, setSpellFilters] = useState<SpellFilters>(INITIAL_SPELL_FILTERS);
  const [creatureFilters, setCreatureFilters] = useState<BrowseFilters>(INITIAL_BROWSE_FILTERS);
  const [itemFilters, setItemFilters] = useState<BrowseFilters>(INITIAL_BROWSE_FILTERS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const controlsRef = useRef<HTMLElement | null>(null);
  const scrollTopRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setExpandedId(null);
  }, [activeTab]);

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
  }, [activeTab, creatures.status, items.status, spells.status]);

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

  const creatureSources = useMemo(() => sourceOptionsForRecords(creatures.records), [creatures.records]);
  const creatureCategories = useMemo(() => uniqueCategories(creatures.records), [creatures.records]);
  const itemTypes = useMemo(() => uniqueSorted(items.records.map((record) => record.itemType)), [items.records]);
  const itemSources = useMemo(() => sourceOptionsForRecords(items.records), [items.records]);
  const itemCategories = useMemo(() => uniqueCategories(items.records), [items.records]);

  const activeState = activeTab === "spells" ? spells : activeTab === "creatures" ? creatures : items;
  const activeRecords =
    activeTab === "spells" ? visibleSpells : activeTab === "creatures" ? visibleCreatures : visibleItems;
  const totalCount = activeTab === "spells" ? spells.records.length : activeTab === "creatures" ? creatures.records.length : items.records.length;

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
            categoryOptions={itemCategories}
            filters={itemFilters}
            label="magic items"
            primaryLabel="Type"
            primaryOptions={itemTypes}
            setFilters={setItemFilters}
            sourceOptions={itemSources}
          />
        ) : null}
      </section>

      <section className="results-region" aria-label="Results">
        {activeState.status === "error" ? <div className="empty-state">Unable to load data: {activeState.error}</div> : null}
        {activeState.status !== "error" ? (
          <VirtualResults expandedId={expandedId} records={activeRecords} setExpandedId={setExpandedId} />
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
