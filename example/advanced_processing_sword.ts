// deno run --allow-write example/advanced_processing_sword.ts
import type { DirectedGraph } from "graphology";
import {
  createNodeFilter,
  createNodeTransformer,
  type ProcessingContext,
  ProcessingPipeline,
} from "../src/mod.ts";
import { EdgeAttributes } from "../src/types.ts";
import { graph } from "./sword.shared.ts";
import { Item, ItemNodeAttributes } from "./sword.type.ts";

// ========================================
// Using the Processing System
// ========================================

/**
 * Step 1: Transform graph nodes to Item objects
 */
function transformToItems(graph: DirectedGraph): Item[] {
  const context: ProcessingContext = { graph };
  const pipeline = new ProcessingPipeline(context);

  // Filter only item nodes
  pipeline.add(
    createNodeFilter((_node, attributes) => attributes.type === "item"),
  );

  // Transform to Item objects
  pipeline.add(
    createNodeTransformer<Item, ProcessingContext>(
      (nodeId, attributes, connectedNodes, context) => {
        const { graph } = context;

        // Get connected nodes by type
        const attributeNodes = connectedNodes["attribute"] || [];
        const tierNodes = connectedNodes["tier"] || [];
        const setNodes = connectedNodes["set"] || [];
        const slotNodes = connectedNodes["slot"] || [];

        // Extract attributes with their amounts
        const attributesMap: Record<string, number> = {};
        for (const attr of attributeNodes) {
          const amount = graph.getEdgeAttribute(nodeId, attr.id, "amount") || 0;
          attributesMap[attr.id] = amount;
        }

        // Build the Item object
        const item: Item = {
          id: attributes.id,
          name: attributes.name,
          type: attributes.type,
          description: attributes.description || "",
          weight: (attributes as ItemNodeAttributes).weight || 0,
          value: (attributes as ItemNodeAttributes).value || 0,
          set: setNodes[0]?.name || "Unknown",
          slot: slotNodes[0]?.name || "Unknown",
          tier: tierNodes[0]?.name || "Unknown",
          attributes: attributesMap,
        };

        return item;
      },
    ),
  );

  return pipeline.execute<void, Item[]>(undefined);
}

/**
 * Step 2: Generate markdown for items
 */
function generateMarkdown(item: Item): string {
  const attributes = Object.entries(item.attributes)
    .map(([key, value]) =>
      `| ${key.at(0)?.toUpperCase()}${key.substring(1)} | ${value} |`
    )
    .join("\n");

  return `# ${item.name}
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
}

/**
 * Step 3: Export to files
 */
function exportToFiles(items: Item[], baseDir: string): void {
  const context: ProcessingContext = { graph };
  const pipeline = new ProcessingPipeline(context);

  // Add a processor that exports each item
  pipeline.add((items: Item[]) => {
    for (const item of items) {
      const markdown = generateMarkdown(item);

      // Create directory
      Deno.mkdirSync(`${baseDir}/${item.set}/`, { recursive: true });

      // Write file
      Deno.writeTextFileSync(
        `${baseDir}/${item.set}/${item.name}.md`,
        markdown,
      );

      console.log(`✓ Generated: ${baseDir}/${item.set}/${item.name}.md`);
    }

    return items;
  });

  pipeline.execute(items);
}

/**
 * Step 4: Export to JSON/JS
 */
function exportToJS(items: Item[], outputPath: string): void {
  const output = {
    nodes: items.map((item) => ({ ...item })),
    links: [] as EdgeAttributes[],
  };

  Deno.writeTextFileSync(
    outputPath,
    `const graph=${JSON.stringify(output, null, 2)}`,
  );

  console.log(`✓ Generated: ${outputPath}`);
}

// ========================================
// Execute the Processing Pipeline
// ========================================

console.log("=== Processing Graph with Generic System ===\n");

// Transform graph to items
const items = transformToItems(graph);

console.log("Transformed Items:", items.length);
console.log(JSON.stringify(items, null, 2));

// Export to markdown files
exportToFiles(items, `${import.meta.dirname}/md`);

// Export to JS file
exportToJS(items, "./html/generated/items_processed.js");

console.log("\n✓ Processing complete!");
