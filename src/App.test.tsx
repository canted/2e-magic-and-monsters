import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import App from "./App";
import type { CreatureRecord, ItemRecord, SpellRecord } from "./types";

const spells: SpellRecord[] = [
  {
    id: "spell-1",
    kind: "spell",
    title: "Magic Missile (Wizard Spell)",
    name: "Magic Missile",
    spellClass: "Wizard",
    level: "1",
    schools: ["Evocation"],
    spheres: [],
    components: { verbal: true, somatic: true, material: false },
    fields: { Range: "60 yds.", Duration: "Instantaneous", Source: "PHB" },
    sources: ["PH"],
    categories: ["Wizard Spells"],
    bodyHtml: "<p>A missile of magical energy.</p>",
    bodyText: "a missile of magical energy",
    searchText: "magic missile wizard 1 evocation a missile of magical energy"
  },
  {
    id: "spell-2",
    kind: "spell",
    title: "Acid Arrow (Wizard Spell)",
    name: "Acid Arrow",
    spellClass: "Wizard",
    level: "2",
    schools: ["Conjuration"],
    spheres: [],
    components: { verbal: true, somatic: true, material: true },
    fields: { Range: "180 yds.", Duration: "Special", Source: "PHB" },
    sources: ["PH"],
    categories: ["Wizard Spells"],
    bodyHtml: "<p>An arrow that burns with acid.</p>",
    bodyText: "an arrow that burns with acid",
    searchText: "acid arrow wizard 2 conjuration an arrow that burns with acid"
  },
  {
    id: "spell-3",
    kind: "spell",
    title: "Bless (Priest Spell)",
    name: "Bless",
    spellClass: "Priest",
    level: "1",
    schools: ["Conjuration"],
    spheres: ["All"],
    components: { verbal: true, somatic: true, material: true },
    fields: { Range: "60 yds.", Duration: "6 rds.", Source: "PHB" },
    sources: ["PH"],
    categories: ["Priest Spells"],
    bodyHtml: "<p>A blessing for allies.</p>",
    bodyText: "a blessing for allies",
    searchText: "bless priest 1 conjuration all a blessing for allies"
  },
  {
    id: "spell-4",
    kind: "spell",
    title: "Chill (Wizard Spell)",
    name: "Chill",
    spellClass: "Wizard",
    level: "1",
    schools: ["Evocation"],
    spheres: [],
    components: { verbal: true, somatic: true, material: false },
    fields: { Range: "10 yds.", Duration: "Instantaneous", Source: "Dragon Magazine #229" },
    sources: ["Dragon Magazine #229"],
    categories: ["Wizard Spells"],
    bodyHtml: "<p>A sharp cold cantrip.</p>",
    bodyText: "a sharp cold cantrip",
    searchText: "chill wizard 1 evocation dragon magazine #229 a sharp cold cantrip"
  },
  {
    id: "spell-5",
    kind: "spell",
    title: "Monster Charm (Wizard Spell)",
    name: "Monster Charm",
    spellClass: "Wizard",
    level: "4",
    schools: ["Enchantment"],
    spheres: [],
    components: { verbal: true, somatic: true, material: false },
    fields: { Range: "60 yds.", Duration: "Special", Source: "Monstrous Manual" },
    sources: ["MM"],
    categories: ["Wizard Spells"],
    bodyHtml: "<p>A charm drawn from a monster entry.</p>",
    bodyText: "a charm drawn from a monster entry",
    searchText: "monster charm wizard 4 enchantment monstrous manual a charm drawn from a monster entry"
  }
];

const creatures: CreatureRecord[] = [
  {
    id: "creature-1",
    kind: "creature",
    title: "Aarakocra (Creature)",
    name: "Aarakocra",
    fields: { Source: "Monstrous Manual", "Armor Class": "7", "Hit Dice": "1+2" },
    sources: ["MM"],
    categories: ["Creatures", "Monstrous Manual Creatures"],
    bodyHtml: "<p>Bird-men of high mountains.</p>",
    bodyText: "bird-men of high mountains",
    searchText: "aarakocra bird-men of high mountains creatures monstrous manual creatures"
  },
  {
    id: "creature-2",
    kind: "creature",
    title: "Annual Beast (Creature)",
    name: "Annual Beast",
    fields: { Source: "Monstrous Compendium Annual Volume One", "Armor Class": "5", "Hit Dice": "3" },
    sources: ["Monstrous Compendium Annual Volume One"],
    categories: ["Creatures"],
    bodyHtml: "<p>A beast from an annual appendix.</p>",
    bodyText: "a beast from an annual appendix",
    searchText: "annual beast monstrous compendium annual volume one"
  }
];

const items: ItemRecord[] = [
  {
    id: "item-1",
    kind: "item",
    title: "Cloak Clasp of Holding (Magic Item)",
    name: "Cloak Clasp of Holding",
    itemType: "Magic Cloak Clasp",
    itemKinds: ["Worn Gear & Clothing"],
    fields: {
      Type: "Magic Cloak Clasp",
      Kind: "Worn Gear & Clothing",
      XP: "60 xp",
      Value: "600 gp",
      Source: "Dungeon Master Guide"
    },
    sources: ["DMG"],
    categories: ["Magic Items", "Magic Cloak Clasps"],
    bodyHtml: "<p>A silver clasp that holds on command.</p>",
    bodyText: "a silver clasp that holds on command",
    searchText: "cloak clasp of holding magic cloak clasp a silver clasp that holds on command"
  },
  {
    id: "item-2",
    kind: "item",
    title: "Ring of Sparks (Magic Ring)",
    name: "Ring of Sparks",
    itemType: "Magic Ring",
    itemKinds: ["Rings"],
    fields: { Type: "Magic Ring", Kind: "Rings", XP: "500 xp", Value: "2,500 gp", Source: "Encyclopedia Magica" },
    sources: ["Encyclopedia Magica"],
    categories: ["Magic Items", "Magic Rings"],
    bodyHtml: "<p>A ring that crackles with sparks.</p>",
    bodyText: "a ring that crackles with sparks",
    searchText: "ring of sparks magic ring encyclopedia magica a ring that crackles with sparks"
  }
];

function mockFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url.endsWith("spells.json")) {
        return Promise.resolve(new Response(JSON.stringify(spells), { status: 200 }));
      }
      if (url.endsWith("creatures.json")) {
        return Promise.resolve(new Response(JSON.stringify(creatures), { status: 200 }));
      }
      if (url.endsWith("items.json")) {
        return Promise.resolve(new Response(JSON.stringify(items), { status: 200 }));
      }
      return Promise.resolve(new Response("[]", { status: 404 }));
    })
  );
}

describe("App", () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filters spells by class checkboxes", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");
    expect(screen.getByText("Bless")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Priest"));
    await waitFor(() => expect(screen.queryByText("Bless")).not.toBeInTheDocument());
    expect(screen.getByText("Magic Missile")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Wizard"));
    await waitFor(() => expect(screen.getByText("Bless")).toBeInTheDocument());
    expect(screen.queryByText("Magic Missile")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Priest")).toBeChecked();
    expect(screen.getByLabelText("Wizard")).not.toBeChecked();
  });

  it("searches spell descriptions and opens accordion details", async () => {
    const { container } = render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.change(screen.getByLabelText("Search spells"), { target: { value: "acid" } });
    await waitFor(() => expect(screen.getByText("Acid Arrow")).toBeInTheDocument());
    expect(screen.queryByText("Magic Missile")).not.toBeInTheDocument();
    expect(screen.queryByText("VSM")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Acid Arrow"));
    expect(await screen.findByText("An arrow that burns with acid.")).toBeInTheDocument();
    const detail = container.querySelector(".result-detail") as HTMLElement;
    expect(screen.queryByText("Expanded Details")).not.toBeInTheDocument();
    expect(within(detail).getByText("Schools")).toBeInTheDocument();
    expect(within(detail).getByText("Conjuration")).toBeInTheDocument();
    expect(within(detail).getByText("Components")).toBeInTheDocument();
    expect(within(detail).getByText("VSM")).toBeInTheDocument();
    const detailHtml = detail.innerHTML;
    expect(detailHtml.indexOf("wiki-body")).toBeLessThan(detailHtml.indexOf("detail-footer"));
    expect(container.querySelector(".detail-footer")?.textContent).toContain("Source");
    expect(container.querySelector(".detail-footer")?.textContent).toContain("PHB");
    expect(container.querySelector(".detail-footer")?.textContent).toContain("Categories");
  });

  it("labels priest spell taxonomy as spheres", async () => {
    const { container } = render(<App />);
    await screen.findByText("Bless");

    fireEvent.click(screen.getByText("Bless"));
    const detail = container.querySelector(".result-detail") as HTMLElement;
    expect(within(detail).getByText("Spheres")).toBeInTheDocument();
    expect(within(detail).getByText("All")).toBeInTheDocument();
  });

  it("filters by level, taxonomy, and material component", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.change(screen.getByDisplayValue("All"), { target: { value: "2" } });
    await waitFor(() => expect(screen.getByText("Acid Arrow")).toBeInTheDocument());
    expect(screen.queryByText("Magic Missile")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("M"));
    expect(screen.getByText("Acid Arrow")).toBeInTheDocument();

    const taxonomy = screen.getByLabelText("Schools and spheres");
    fireEvent.keyDown(taxonomy, { key: "ArrowDown" });
    fireEvent.click(within(await screen.findByRole("listbox")).getByText("Conjuration"));
    expect(screen.getByText("Acid Arrow")).toBeInTheDocument();
  });

  it("shows full source option labels while keeping core source pills abbreviated", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");
    expect(screen.queryByText("Chill")).not.toBeInTheDocument();
    expect(screen.getByText("PH")).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
    expect(screen.queryByText("DMG")).not.toBeInTheDocument();

    const sources = screen.getByLabelText("Spell sources");
    fireEvent.keyDown(sources, { key: "ArrowDown" });
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Player's Handbook")).toBeInTheDocument();
    expect(within(listbox).getByText("Monstrous Manual")).toBeInTheDocument();
    expect(within(listbox).queryByText("Dungeon Master's Guide")).not.toBeInTheDocument();
    fireEvent.click(within(listbox).getByText("Dragon Magazine #229"));
    expect(await screen.findByText("Chill")).toBeInTheDocument();
  });

  it("switches to monster and magic item tabs", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.click(screen.getByText("Monsters"));
    expect(await screen.findByText("Aarakocra")).toBeInTheDocument();
    expect(screen.getByText("MM")).toBeInTheDocument();
    expect(screen.queryByText("Annual Beast")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Magic Items"));
    expect(await screen.findByText("Cloak Clasp of Holding")).toBeInTheDocument();
    expect(screen.queryByText("Ring of Sparks")).not.toBeInTheDocument();
    expect(screen.getByText("DMG")).toBeInTheDocument();
    expect(screen.queryByText("PH")).not.toBeInTheDocument();
    expect(screen.queryByText("MM")).not.toBeInTheDocument();
  });

  it("uses plain full labels in source menus without invalid defaults", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.click(screen.getByText("Monsters"));
    await screen.findByText("Aarakocra");
    const monsterSources = screen.getByLabelText("monsters sources");
    fireEvent.keyDown(monsterSources, { key: "ArrowDown" });
    let listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Monstrous Manual")).toBeInTheDocument();
    expect(within(listbox).queryByText(/Author:/)).not.toBeInTheDocument();
    fireEvent.keyDown(monsterSources, { key: "Escape" });

    fireEvent.click(screen.getByText("Magic Items"));
    await screen.findByText("Cloak Clasp of Holding");
    const itemSources = screen.getByLabelText("magic items sources");
    fireEvent.keyDown(itemSources, { key: "ArrowDown" });
    listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("Dungeon Master's Guide")).toBeInTheDocument();
    expect(within(listbox).queryByText("Player's Handbook")).not.toBeInTheDocument();
    expect(within(listbox).queryByText("Monstrous Manual")).not.toBeInTheDocument();
  });

  it("narrows browse filter options to the selected source", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.click(screen.getByText("Magic Items"));
    await screen.findByText("Cloak Clasp of Holding");

    expect(screen.getByLabelText("magic items kind")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Worn Gear & Clothing" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Rings" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("magic items category")).not.toBeInTheDocument();
  });
});
