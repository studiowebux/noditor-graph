// deno run --allow-write example/processing_prng_attributes_2.ts
import type { DirectedGraph } from "graphology";
import {
  createBatchProcessor,
  groupConnectedNodesByType,
  type ProcessingContext,
  ProcessingPipeline,
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
// Processing: PRNG-based Attribute Randomization
// ========================================

/**
 * Advanced version: With min/max bounds
 */
function applyPRNGToAttributesAdvanced(
  graph: DirectedGraph,
  seed: number,
): void {
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

        console.log(
          `\n=== Processing (Advanced): ${
            graph.getNodeAttribute(node, "name")
          } ===`,
        );

        // Calculate base multiplier
        let baseMultiplier = 1;

        if (tier.length !== 0) {
          switch (tier[0].id) {
            case "advanced":
              baseMultiplier = 2;
              break;
            case "normal":
              baseMultiplier = 1;
              break;
          }
        }

        console.log(`Base Multiplier: ${baseMultiplier}`);

        // Calculate attribute sum first (for bounds)
        const attributeBaseSum = attributes.reduce((sum, attr) => {
          return sum + (graph.getEdgeAttribute(node, attr.id, "amount") || 1);
        }, 0);

        // Randomize attributes with min/max bounds
        let attributeSum = 0;
        for (const attribute of attributes) {
          const currentValue =
            graph.getEdgeAttribute(node, attribute.id, "amount") || 1;

          // Apply PRNG with min/max bounds
          // Min: current value * multiplier * (1 + small random)
          // Max: bounded by total attribute sum
          const minValue = Math.ceil(
            currentValue * baseMultiplier * (1 + generate_float(prng)),
          );
          const maxBound = attributeBaseSum * baseMultiplier + 1;

          const randomizedValue = Math.ceil(
            Math.min(
              minValue,
              generate_min_max_integer(prng, currentValue, maxBound),
            ),
          );

          graph.updateDirectedEdgeAttribute(
            node,
            attribute.id,
            "amount",
            () => randomizedValue,
          );

          attributeSum += randomizedValue;

          console.log(
            `  ${attribute.name}: ${currentValue} → ${randomizedValue} (min: ${minValue}, max: ${maxBound})`,
          );
        }

        // Update item value
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

console.log("\n\n=== Example 2: Advanced PRNG with Min/Max Bounds ===");

// Apply advanced PRNG processing
applyPRNGToAttributesAdvanced(graph, 123);

exportAll(graph);
