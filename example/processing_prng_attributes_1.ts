// deno run --allow-write example/processing_prng_attributes_1.ts
import type { DirectedGraph } from "graphology";
import {
  createBatchProcessor,
  groupConnectedNodesByType,
  type ProcessingContext,
  ProcessingPipeline,
} from "../src/processing.ts";
import {
  generate_float,
  initialize_prng,
  type Xorshift32,
} from "jsr:@studiowebux/xorshift32";
import { graph } from "./sword.shared.ts";
import { exportAll } from "./export.shared.ts";

// ========================================
// Processing: PRNG-based Attribute Randomization
// ========================================

/**
 * This processor applies PRNG to randomize attribute values and item values
 */
function applyPRNGToAttributes(graph: DirectedGraph, seed: number): void {
  const prng: Xorshift32 = initialize_prng(seed);

  const context: ProcessingContext = {
    graph,
    prng,
  };

  const pipeline = new ProcessingPipeline(context);

  pipeline.add(
    createBatchProcessor(
      (_node, attributes) => attributes.type === "item",
      (node, context) => {
        const { graph, prng } = context;
        const connectedGroups = groupConnectedNodesByType(graph, node);

        const attributes = connectedGroups["attribute"] || [];
        const tier = connectedGroups["tier"] || [];
        const set = connectedGroups["set"] || [];
        const slot = connectedGroups["slot"] || [];

        console.log(
          `\n=== Processing: ${graph.getNodeAttribute(node, "name")} ===`,
        );

        // Calculate base multiplier from metadata
        let baseMultiplier = 1;

        // Tier affects multiplier
        if (tier.length !== 0) {
          switch (tier[0].id) {
            case "advanced":
              baseMultiplier += 0.5;
              break;
            case "normal":
              baseMultiplier += 0;
              break;
          }
        }

        // Set affects multiplier
        if (set.length !== 0 && set[0].id === "basic") {
          baseMultiplier += 0.2;
        }

        // Slot affects multiplier
        if (slot.length !== 0 && slot[0].id === "main_hand") {
          baseMultiplier += 0.3;
        }

        console.log(`Base Multiplier: ${baseMultiplier}`);

        // Randomize attribute amounts using PRNG
        let attributeSum = 0;
        for (const attribute of attributes) {
          const currentValue =
            graph.getEdgeAttribute(node, attribute.id, "amount") || 1;

          // Apply PRNG randomization
          // Formula: base_value * multiplier * (1 + random_float)
          const randomizedValue = Math.ceil(
            currentValue * baseMultiplier * (1 + generate_float(prng)),
          );

          graph.updateDirectedEdgeAttribute(
            node,
            attribute.id,
            "amount",
            () => randomizedValue,
          );

          attributeSum += randomizedValue;

          console.log(
            `  ${attribute.name}: ${currentValue} → ${randomizedValue} (base: ${currentValue}, multiplier: ${baseMultiplier}, random: ${
              (1 + generate_float(prng)).toFixed(2)
            })`,
          );
        }

        // Update item value based on attribute sum
        // Formula: base_value * multiplier * attribute_sum
        const baseValue = graph.getNodeAttribute(node, "value") || 1;
        const newValue = Math.ceil(baseValue * baseMultiplier * attributeSum);

        graph.updateNodeAttribute(
          node,
          "value",
          () => newValue,
        );

        console.log(
          `Value: ${baseValue} → ${newValue} (attribute sum: ${attributeSum})`,
        );
      },
    ),
  );

  pipeline.execute(undefined);
}

console.log("=== Example 1: Basic PRNG Randomization ===");

// Apply PRNG processing (seed: 42)
applyPRNGToAttributes(graph, 42);

exportAll(graph);
