import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { BookOpen, Box, ChevronDown, FlaskConical, Search, Shield } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const INITIAL_SPELL_FILTERS: SpellFilters = {
  wizard: true,
  priest: true,
  search: "",
  level: "",
  taxonomy: [],
  verbal: false,
  somatic: false,
  material: false
};

const INITIAL_BROWSE_FILTERS: BrowseFilters = {
  search: "",
  primary: "",
  category: ""
};

interface TaxonomyOption {
  label: string;
  value: string;
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
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    initialRect: { height: 640, width: 1024 },
    overscan: 8
  });

  useEffect(() => {
    virtualizer.measure();
  }, [expandedId, records.length, virtualizer]);

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
              style={{ transform: `translateY(${virtualRow.start}px)` }}
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
  const levels = useMemo(() => uniqueSorted(records.map((record) => record.level)), [records]);
  const schools = useMemo(() => uniqueSorted(records.flatMap((record) => record.schools)), [records]);
  const spheres = useMemo(() => uniqueSorted(records.flatMap((record) => record.spheres)), [records]);
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
        <Select<TaxonomyOption, true>
          aria-label="Schools and spheres"
          className="taxonomy-picker"
          classNamePrefix="taxonomy-picker"
          closeMenuOnSelect={false}
          inputId="taxonomy-select"
          isClearable
          isMulti
          onChange={(value: MultiValue<TaxonomyOption>) =>
            update({
              taxonomy: value.map((option) => option.value)
            })
          }
          options={taxonomyOptions}
          placeholder="All schools and spheres"
          value={selectedTaxonomy}
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
  filters,
  setFilters
}: {
  label: string;
  primaryLabel: string;
  primaryOptions: string[];
  categoryOptions: string[];
  filters: BrowseFilters;
  setFilters: (filters: BrowseFilters) => void;
}) {
  const update = (patch: Partial<BrowseFilters>) => setFilters({ ...filters, ...patch });
  return (
    <form className="filter-bar" role="search">
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

  useEffect(() => {
    setExpandedId(null);
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

  const creatureSources = useMemo(() => uniqueSorted(creatures.records.map((record) => record.fields.Source)), [creatures.records]);
  const creatureCategories = useMemo(() => uniqueCategories(creatures.records), [creatures.records]);
  const itemTypes = useMemo(() => uniqueSorted(items.records.map((record) => record.itemType)), [items.records]);
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

      <section className="controls-region">
        {activeTab === "spells" ? (
          <SpellControls filters={spellFilters} records={spells.records} setFilters={setSpellFilters} />
        ) : null}
        {activeTab === "creatures" ? (
          <BrowseControls
            categoryOptions={creatureCategories}
            filters={creatureFilters}
            label="monsters"
            primaryLabel="Source"
            primaryOptions={creatureSources}
            setFilters={setCreatureFilters}
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
          />
        ) : null}
      </section>

      <section className="results-region" aria-label="Results">
        {activeState.status === "error" ? <div className="empty-state">Unable to load data: {activeState.error}</div> : null}
        {activeState.status !== "error" ? (
          <VirtualResults expandedId={expandedId} records={activeRecords} setExpandedId={setExpandedId} />
        ) : null}
      </section>
    </main>
  );
}
