import { assertEquals, assertThrows } from "jsr:@std/assert";
import { graphologyToMD } from "./export.ts";

type Row = {
  nodes: Array<{ id: string } & Record<string, unknown>>;
  links: Array<{ source: string; target: string } & Record<string, unknown>>;
};

type Node = { id: string; type: string; name?: string };
type Item = { id: string; name: string; targets: string[] };

/**
 * Run graphologyToMD and capture the items map it builds, so the seeding /
 * link-processing behaviour can be asserted directly.
 */
function collect(
  rows: Row,
  nodeFilter?: (node: Node) => boolean,
): Map<string, Item> {
  let result: Map<string, Item> = new Map();

  graphologyToMD<Row, Node, Item>({
    rows,
    nodeFilter,
    createEmptyItem: () => ({ id: "", name: "", targets: [] }),
    populateItemFromNode: (data, node) => {
      data.id = node.id;
      data.name = node.name ?? "";
    },
    processLink: (data, link) => {
      data.targets.push(link.target);
    },
    generateMarkdown: (items) => {
      result = items;
    },
  });

  return result;
}

Deno.test("item with edges and item with no edges both appear", () => {
  const rows: Row = {
    nodes: [
      { id: "sword", type: "item", name: "Sword" },
      { id: "shield", type: "item", name: "Shield" }, // no edges
      { id: "iron", type: "set", name: "Iron" },
    ],
    links: [{ source: "sword", target: "iron" }],
  };

  const items = collect(rows, (node) => node.type === "item");

  // Both items show up; the set node is filtered out.
  assertEquals([...items.keys()].sort(), ["shield", "sword"]);

  // The connected item carries its linked data...
  assertEquals(items.get("sword")?.targets, ["iron"]);

  // ...while the edge-less item is present with empty link data
  // (the regression: it used to be silently dropped).
  assertEquals(items.get("shield")?.targets, []);
  assertEquals(items.get("shield")?.name, "Shield");
});

Deno.test("a link whose source node is missing throws", () => {
  const rows: Row = {
    nodes: [{ id: "a", type: "item" }],
    links: [{ source: "ghost", target: "a" }],
  };

  assertThrows(() => collect(rows), Error, "No node found for ghost => a");
});

Deno.test("a filtered-out source node skips its link silently", () => {
  const rows: Row = {
    nodes: [
      { id: "a", type: "set" },
      { id: "b", type: "item" },
    ],
    links: [{ source: "a", target: "b" }],
  };

  const items = collect(rows, (node) => node.type === "item");

  assertEquals([...items.keys()], ["b"]);
  assertEquals(items.get("b")?.targets, []);
});
