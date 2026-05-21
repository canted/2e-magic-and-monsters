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
  }
];

const items: ItemRecord[] = [
  {
    id: "item-1",
    kind: "item",
    title: "Cloak Clasp of Holding (Magic Item)",
    name: "Cloak Clasp of Holding",
    itemType: "Magic Cloak Clasp",
    fields: { Type: "Magic Cloak Clasp", XP: "60 xp", Value: "600 gp", Source: "Dungeon Master Guide" },
    sources: ["DMG"],
    categories: ["Magic Items", "Magic Cloak Clasps"],
    bodyHtml: "<p>A silver clasp that holds on command.</p>",
    bodyText: "a silver clasp that holds on command",
    searchText: "cloak clasp of holding magic cloak clasp a silver clasp that holds on command"
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
  });

  it("searches spell descriptions and opens accordion details", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.change(screen.getByLabelText("Search spells"), { target: { value: "acid" } });
    await waitFor(() => expect(screen.getByText("Acid Arrow")).toBeInTheDocument());
    expect(screen.queryByText("Magic Missile")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Acid Arrow"));
    expect(await screen.findByText("An arrow that burns with acid.")).toBeInTheDocument();
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

  it("defaults source filters to core books and can add another source", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");
    expect(screen.queryByText("Chill")).not.toBeInTheDocument();

    const sources = screen.getByLabelText("Spell sources");
    fireEvent.keyDown(sources, { key: "ArrowDown" });
    fireEvent.click(within(await screen.findByRole("listbox")).getByText("Dragon Magazine #229"));
    expect(await screen.findByText("Chill")).toBeInTheDocument();
  });

  it("switches to monster and magic item tabs", async () => {
    render(<App />);
    await screen.findByText("Magic Missile");

    fireEvent.click(screen.getByText("Monsters"));
    expect(await screen.findByText("Aarakocra")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Magic Items"));
    expect(await screen.findByText("Cloak Clasp of Holding")).toBeInTheDocument();
  });
});
