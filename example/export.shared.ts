import { DirectedGraph } from "graphology";
import { graphologyToD3, graphologyToMD } from "../src/export.ts";
import { EdgeAttributes, Item, NodeAttributes } from "./sword.type.ts";

export function exportAll(graph: DirectedGraph) {
  const output = graphologyToD3(graph);

  console.log("Output:", output);

  Deno.writeTextFileSync(
    "./html/generated/items.js",
    `const graph=${JSON.stringify(output)}`,
  );

  graphologyToMD({
    "rows": output,
    nodeFilter: (node: NodeAttributes) => node.type === "item",
    createEmptyItem: (): Item => ({
      id: "",
      name: "",
      type: "",
      description: "",
      weight: 0,
      value: 0,
      set: "",
      slot: "",
      tier: "",
      attributes: {},
    }),
    generateMarkdown: (items) => {
      for (const [_, item] of items) {
        const attributes = Object.entries(item.attributes)
          .map(([l, r]) =>
            `| ${l.at(0)?.toUpperCase()}${l.substring(1)} | ${r} |`
          )
          .join("\n");

        const markdown = `# ${item.name}
#${item.tier.replace(/\s/g, "_").toLowerCase()} #${
          item.slot.replace(/\s/g, "_").toLowerCase()
        } #${item.set.replace(/\s/g, "_").toLowerCase()} #item

## Description
${item.description}

## Tier
${item.tier}

## Slot
${item.slot}

## Set
${item.set}

## Configurations
| Option | Value |
| ------ | ----- |
| Weight | ${item.weight} |
| Value | ${item.value} |



## Attributes
${
          attributes
            ? `| Attribute | Value |
| ----- | ----- |
${attributes}`
            : "None"
        }
  `;

        Deno.mkdirSync(
          `${import.meta.dirname}/md/${item.set}/`,
          { recursive: true },
        );
        Deno.writeTextFileSync(
          `${import.meta.dirname}/md/${item.set}/${item.name}.md`,
          markdown,
        );
      }

      return;
    },
    populateItemFromNode: (data: Item, node: NodeAttributes) => {
      data.id = node.id;
      data.name = node.name;
      data.type = node.type;
      data.description = node.description || "";

      if (node.type === "item") {
        data.weight = node.weight || 0;
        data.value = node.value || 0;
        // data.attributes = node.attributes || {}; Hum ?
      }

      if ("set" in node) {
        data.set = node.name || "Unknown";
      }
      if ("slot" in node) {
        data.slot = node.name || "Unknown";
      }
      if ("tier" in node) {
        data.tier = node.name || "Unknown";
      }
    },
    processLink: (
      data,
      link: EdgeAttributes & { source: string; target: string },
      targetNode,
    ) => {
      if (!targetNode) {
        throw new Error(`No target node for ${link.source} => ${link.target}`);
      }

      if (targetNode.type === "set") {
        data.set = targetNode.name;
      } else if (targetNode.type === "slot") {
        data.slot = targetNode.name;
      } else if (targetNode.type === "tier") {
        data.tier = targetNode.name;
      } else if (targetNode.type === "attribute") {
        data.attributes[targetNode.id] = link.amount || 0;
      }
    },
  });
}
