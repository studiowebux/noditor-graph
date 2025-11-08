import { DirectedGraph } from "graphology";
import { GraphOutput } from "./types.ts";

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

  for (const row of rows.links) {
    let data: TItem;

    if (items.has(row.source)) {
      data = items.get(row.source)!;
    } else {
      // Find the source node, optionally applying the filter
      const node = rows.nodes.find((n) => {
        if (n.id !== row.source) return false;
        return nodeFilter ? nodeFilter(n as TNode) : true;
      });

      if (!node) {
        throw new Error(`No node found for ${row.source} => ${row.target}`);
      }

      data = createEmptyItem();
      populateItemFromNode(data, node as TNode);
    }

    // Find the target node for additional context
    const targetNode = rows.nodes.find((n) => n.id === row.target) as
      | TNode
      | undefined;

    processLink(data, row, targetNode);
    items.set(row.source, data);
  }

  return generateMarkdown(items);
}
