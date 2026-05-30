import type { DirectedGraph } from "graphology";
import type { GraphOutput } from "./types.ts";

/**
 * Export a graph to D3.js format
 */
export function graphologyToD3(graph: DirectedGraph): GraphOutput {
  const nodes = graph.nodes().map((id) => ({
    id,
    ...graph.getNodeAttributes(id),
  }));

  const links = graph.edges().map((id) => {
    const [source, target] = graph.extremities(id);
    return {
      source,
      target,
      ...graph.getEdgeAttributes(id),
    };
  });

  return { nodes, links };
}

/**
 * Generic function to convert graph data to Markdown format
 * @param rows - The graph data with nodes and links
 * @param nodeFilter - Filter function to determine if a node should be included (optional)
 * @param createEmptyItem - Factory function to create an empty item
 * @param populateItemFromNode - Function to populate item data from a node
 * @param processLink - Function to process each link and update the item
 * @param generateMarkdown - Function to generate the final markdown string
 * @returns Markdown string
 */
export function graphologyToMD<
  TGraph extends {
    nodes: Array<{ id: string } & Record<string, unknown>>;
    links: Array<{ source: string; target: string } & Record<string, unknown>>;
  },
  TNode extends Record<string, unknown>,
  TItem extends Record<string, unknown>,
>({
  rows,
  nodeFilter,
  createEmptyItem,
  populateItemFromNode,
  processLink,
  generateMarkdown,
}: {
  rows: TGraph;
  nodeFilter?: (node: TNode) => boolean;
  createEmptyItem: () => TItem;
  populateItemFromNode: (data: TItem, node: TNode) => void;
  processLink: (
    data: TItem,
    link: TGraph["links"][number],
    targetNode: TNode | undefined,
  ) => void;
  generateMarkdown: (items: Map<string, TItem>) => void;
}): void {
  const items: Map<string, TItem> = new Map();

  // Seed an item for every (filtered) node up front so that nodes with no
  // edges still appear in the output instead of being silently dropped.
  for (const node of rows.nodes) {
    if (nodeFilter && !nodeFilter(node as TNode)) {
      continue;
    }

    const data = createEmptyItem();
    populateItemFromNode(data, node as TNode);
    items.set(node.id, data);
  }

  for (const row of rows.links) {
    const data = items.get(row.source);

    if (!data) {
      // No seeded item means the source node was either filtered out or is
      // genuinely missing. A truly missing node is an error; a filtered one
      // just skips this link.
      const exists = rows.nodes.some((n) => n.id === row.source);

      if (!exists) {
        throw new Error(`No node found for ${row.source} => ${row.target}`);
      }

      continue;
    }

    // Find the target node for additional context
    const targetNode = rows.nodes.find((n) => n.id === row.target) as
      | TNode
      | undefined;

    processLink(data, row, targetNode);
  }

  return generateMarkdown(items);
}

/**
 * Export graph to JSON format with all nodes and edges
 * @param rows - The graph data with nodes and links
 * @param generateJSON - Function to generate and handle the JSON output
 * @returns Result from generateJSON callback
 */
export function graphologyToJSON<
  TGraph extends {
    nodes: Array<{ id: string } & Record<string, unknown>>;
    links: Array<{ source: string; target: string } & Record<string, unknown>>;
  },
  TReturn = void,
>({
  rows,
  generateJSON,
}: {
  rows: TGraph;
  generateJSON: (data: TGraph) => TReturn;
}): TReturn {
  return generateJSON(rows);
}
