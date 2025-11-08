// deno run --allow-write example/processing_prng_attributes_3.ts
import type { DirectedGraph } from "graphology";
import {
  createNodeFilter,
  createNodeTransformer,
  groupConnectedNodesByType,
  type ProcessingContext,
  ProcessingPipeline,
  type Processor,
} from "../src/processing.ts";
import {
  generate_float,
  generate_min_max_integer,
  initialize_prng,
  type Xorshift32,
} from "jsr:@studiowebux/xorshift32";
import { graph } from "./sword.shared.ts";
import { exportAll } from "./export.shared.ts";

// ========================================
// Multi-Step Pipeline Processing
// Each step is a separate processor function
// ========================================

type ItemWithMetadata = {
  nodeId: string;
  name: string;
  baseMultiplier: number;
  attributeBaseSum: number;
};

type ItemWithRandomizedAttributes = ItemWithMetadata & {
  randomizedAttributes: Record<string, number>;
  attributeSum: number;
};

type ItemWithValue = ItemWithRandomizedAttributes & {
  oldValue: number;
  newValue: number;
};

// ========================================
// Processor 1: Filter item nodes
// ========================================

const filterItemNodes = createNodeFilter(
  (_node, attributes) => attributes.type === "item",
);

// ========================================
// Processor 2: Calculate base multipliers
// ========================================

const calculateBaseMultipliers = createNodeTransformer<
  ItemWithMetadata,
  ProcessingContext
>(
  (nodeId, _attributes, connectedNodes, context) => {
    const { graph } = context;
    const tier = connectedNodes["tier"] || [];
    const set = connectedNodes["set"] || [];
    const slot = connectedNodes["slot"] || [];

    console.log(
      `[Step 1] Calculating multiplier for: ${
        graph.getNodeAttribute(nodeId, "name")
      }`,
    );

    let baseMultiplier = 1;

    if (tier.length !== 0) {
      switch (tier[0].id) {
        case "advanced":
          baseMultiplier = 2;
          console.log(`  + Tier (${tier[0].id}): +1.0`);
          break;
        case "normal":
          baseMultiplier = 1;
          console.log(`  + Tier (${tier[0].id}): +0.0`);
          break;
      }
    }

    if (set.length !== 0 && set[0].id === "basic") {
      baseMultiplier += 0.2;
      console.log(`  + Set (${set[0].id}): +0.2`);
    }

    if (slot.length !== 0 && slot[0].id === "main_hand") {
      baseMultiplier += 0.3;
      console.log(`  + Slot (${slot[0].id}): +0.3`);
    }

    console.log(`  = Total Multiplier: ${baseMultiplier}\n`);

    return {
      nodeId,
      name: graph.getNodeAttribute(nodeId, "name"),
      baseMultiplier,
      attributeBaseSum: 0,
    };
  },
);

// ========================================
// Processor 3: Calculate attribute base sums
// ========================================

const calculateAttributeBaseSums: Processor<
  ItemWithMetadata[],
  ItemWithMetadata[],
  ProcessingContext
> = (items, context) => {
  console.log("=".repeat(60));
  console.log("[Step 2] Calculating attribute base sums");
  console.log("=".repeat(60) + "\n");

  return items.map((item) => {
    const { graph } = context;
    const connectedGroups = groupConnectedNodesByType(
      graph,
      item.nodeId,
    );
    const attributes = connectedGroups["attribute"] || [];

    console.log(`Processing: ${item.name}`);

    const attributeBaseSum = attributes.reduce((sum, attr) => {
      const value = graph.getEdgeAttribute(item.nodeId, attr.id, "amount") ||
        1;
      console.log(`  + ${attr.name}: ${value}`);
      return sum + value;
    }, 0);

    console.log(`  = Total: ${attributeBaseSum}\n`);

    return {
      ...item,
      attributeBaseSum,
    };
  });
};

// ========================================
// Processor 4: Randomize attributes with PRNG
// ========================================

const randomizeAttributesWithPRNG: Processor<
  ItemWithMetadata[],
  ItemWithRandomizedAttributes[],
  ProcessingContext
> = (items, context) => {
  console.log("=".repeat(60));
  console.log("[Step 3] Randomizing attributes with PRNG");
  console.log("=".repeat(60) + "\n");

  return items.map((item) => {
    const { graph, prng } = context;
    const connectedGroups = groupConnectedNodesByType(
      graph,
      item.nodeId,
    );
    const attributes = connectedGroups["attribute"] || [];

    console.log(`Processing: ${item.name}`);

    const randomizedAttributes: Record<string, number> = {};
    let attributeSum = 0;

    for (const attribute of attributes) {
      const currentValue =
        graph.getEdgeAttribute(item.nodeId, attribute.id, "amount") || 1;

      const minValue = Math.ceil(
        currentValue * item.baseMultiplier * (1 + generate_float(prng)),
      );
      const maxBound = item.attributeBaseSum * item.baseMultiplier + 1;

      const randomizedValue = Math.ceil(
        Math.min(
          minValue,
          generate_min_max_integer(prng, currentValue, maxBound),
        ),
      );

      randomizedAttributes[attribute.id] = randomizedValue;
      attributeSum += randomizedValue;

      console.log(
        `  ${attribute.name}: ${currentValue} → ${randomizedValue} (min: ${minValue}, max: ${maxBound})`,
      );
    }

    console.log(`  = New Total: ${attributeSum}\n`);

    return {
      ...item,
      randomizedAttributes,
      attributeSum,
    };
  });
};

// ========================================
// Processor 5: Calculate new item values
// ========================================

const calculateItemValues: Processor<
  ItemWithRandomizedAttributes[],
  ItemWithValue[],
  ProcessingContext
> = (items, context) => {
  console.log("=".repeat(60));
  console.log("[Step 4] Calculating new item values");
  console.log("=".repeat(60) + "\n");

  return items.map((item) => {
    const { graph } = context;
    const oldValue = graph.getNodeAttribute(item.nodeId, "value") || 1;
    const newValue = Math.ceil(
      oldValue * item.baseMultiplier * item.attributeSum,
    );

    console.log(`${item.name}:`);
    console.log(
      `  Value: ${oldValue} → ${newValue} (multiplier: ${item.baseMultiplier}, attr sum: ${item.attributeSum})\n`,
    );

    return {
      ...item,
      oldValue,
      newValue,
    };
  });
};

// ========================================
// Processor 6: Apply changes to graph
// ========================================

const applyChangesToGraph: Processor<
  ItemWithValue[],
  ItemWithValue[],
  ProcessingContext
> = (items, context) => {
  console.log("=".repeat(60));
  console.log("[Step 5] Applying changes to graph");
  console.log("=".repeat(60) + "\n");

  for (const item of items) {
    const { graph } = context;

    console.log(`Updating: ${item.name}`);

    // Update attribute amounts
    for (const [attrId, amount] of Object.entries(item.randomizedAttributes)) {
      graph.setEdgeAttribute(item.nodeId, attrId, "amount", amount);
      console.log(`  ✓ ${attrId}: ${amount}`);
    }

    // Update item value
    graph.setNodeAttribute(item.nodeId, "value", item.newValue);
    console.log(`  ✓ value: ${item.newValue}\n`);
  }

  console.log("=".repeat(60));
  console.log("✓ All changes applied to graph!");
  console.log("=".repeat(60));

  return items;
};

// ========================================
// Main: Build and execute the global pipeline
// ========================================

function applyPRNGPipelineProcessing(
  graph: DirectedGraph,
  seed: number,
): void {
  console.log("\n=== Multi-Step Pipeline Processing ===");
  console.log("Using a SINGLE global pipeline with modular processors\n");

  const prng: Xorshift32 = initialize_prng(seed);

  // Create the global processing context
  const context: ProcessingContext = { graph, prng };

  // Create the global pipeline
  const pipeline = new ProcessingPipeline(context);

  // Add all processors to the pipeline
  console.log("Building pipeline...\n");
  console.log("=".repeat(60));
  console.log("[Step 0] Filtering item nodes");
  console.log("=".repeat(60) + "\n");

  pipeline.add(filterItemNodes); // Step 1
  pipeline.add(calculateBaseMultipliers); // Step 2
  pipeline.add(calculateAttributeBaseSums); // Step 3
  pipeline.add(randomizeAttributesWithPRNG); // Step 4
  pipeline.add(calculateItemValues); // Step 5
  pipeline.add(applyChangesToGraph); // Step 6

  // Execute the entire pipeline once
  console.log("Executing global pipeline...\n");
  pipeline.execute(undefined);
}

// ========================================
// Execute
// ========================================

applyPRNGPipelineProcessing(graph, 123);

exportAll(graph);

console.log("\n✓ Processing complete and exported!");
