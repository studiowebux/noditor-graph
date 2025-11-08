import type { DirectedGraph } from "graphology";

/**
 * Generic processing context that can be extended with any additional data
 */
export type ProcessingContext<TGraph = any> = {
  graph: TGraph;
  mappings?: Record<string, Record<string, number | string>>;
  [key: string]: any;
};

/**
 * A processor function that transforms input data using a context
 */
export type Processor<
  TInput = any,
  TOutput = any,
  TContext = ProcessingContext,
> = (
  input: TInput,
  context: TContext,
) => TOutput;

/**
 * A processing pipeline that chains multiple processors together
 */
export class ProcessingPipeline<
  TContext extends ProcessingContext = ProcessingContext,
> {
  private processors: Processor<any, any, TContext>[] = [];

  constructor(private context: TContext) {}

  /**
   * Add a processor to the pipeline
   */
  add<TInput, TOutput>(processor: Processor<TInput, TOutput, TContext>): this {
    this.processors.push(processor);
    return this;
  }

  /**
   * Execute all processors in sequence
   */
  execute<TInput, TOutput>(input: TInput): TOutput {
    return this.processors.reduce(
      (data, processor) => processor(data, this.context),
      input as any,
    ) as TOutput;
  }

  /**
   * Execute processors on each item in an array
   */
  executeMany<TInput, TOutput>(inputs: TInput[]): TOutput[] {
    return inputs.map((input) => this.execute<TInput, TOutput>(input));
  }

  /**
   * Get the current context
   */
  getContext(): TContext {
    return this.context;
  }

  /**
   * Update the context
   */
  updateContext(updates: Partial<TContext>): this {
    this.context = { ...this.context, ...updates };
    return this;
  }
}

/**
 * Helper type for graph node with attributes
 */
export type NodeWithAttributes<T = any> = {
  id: string;
  [key: string]: T;
};

/**
 * Helper to create a processor that filters graph nodes
 */
export function createNodeFilter<TContext extends ProcessingContext>(
  predicate: (node: string, attributes: any) => boolean,
): Processor<void, string[], TContext> {
  return (_input, context) => {
    return context.graph.filterNodes(predicate);
  };
}

/**
 * Helper to get connected nodes with their attributes
 */
export function getConnectedNodes<TGraph extends DirectedGraph>(
  graph: TGraph,
  nodeId: string,
  direction: "in" | "out" | "both" = "out",
): NodeWithAttributes[] {
  const neighborFn = direction === "in"
    ? graph.inNeighbors.bind(graph)
    : direction === "out"
    ? graph.outNeighbors.bind(graph)
    : graph.neighbors.bind(graph);

  return neighborFn(nodeId).map((id) => ({
    id,
    ...graph.getNodeAttributes(id),
  }));
}

/**
 * Helper to group connected nodes by type
 */
export function groupConnectedNodesByType<TGraph extends DirectedGraph>(
  graph: TGraph,
  nodeId: string,
  direction: "in" | "out" | "both" = "out",
): Record<string, NodeWithAttributes[]> {
  const connected = getConnectedNodes(graph, nodeId, direction);
  const grouped: Record<string, NodeWithAttributes[]> = {};

  for (const node of connected) {
    const type = node.type || "unknown";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(node);
  }

  return grouped;
}

/**
 * Helper to apply a mapping value based on a key
 */
export function applyMapping(
  mappingName: string,
  key: string,
  context: ProcessingContext,
  defaultValue: number | string = 0,
): number | string {
  return context.mappings?.[mappingName]?.[key] ?? defaultValue;
}

/**
 * Helper to calculate a value factor based on multiple mappings
 */
export function calculateValueFactor(
  config: {
    base?: number;
    mappings?: Array<{
      name: string;
      key: string;
      default?: number;
    }>;
    customFactors?: number[];
  },
  context: ProcessingContext,
): number {
  let factor = config.base ?? 0;

  // Apply mappings
  if (config.mappings) {
    for (const mapping of config.mappings) {
      const value = applyMapping(
        mapping.name,
        mapping.key,
        context,
        mapping.default ?? 0,
      );
      factor += Number(value);
    }
  }

  // Apply custom factors
  if (config.customFactors) {
    for (const customFactor of config.customFactors) {
      factor += customFactor;
    }
  }

  return factor;
}

/**
 * Create a processor that updates edge attributes
 */
export function createEdgeAttributeUpdater<TContext extends ProcessingContext>(
  sourceNode: string | ((context: TContext) => string),
  targetNode: string | ((context: TContext) => string),
  attribute: string,
  updateFn: (currentValue: any, context: TContext) => any,
): Processor<void, void, TContext> {
  return (_input, context) => {
    const source = typeof sourceNode === "function"
      ? sourceNode(context)
      : sourceNode;
    const target = typeof targetNode === "function"
      ? targetNode(context)
      : targetNode;

    context.graph.updateDirectedEdgeAttribute(
      source,
      target,
      attribute,
      (value: any) => updateFn(value, context),
    );
  };
}

/**
 * Create a processor that updates node attributes
 */
export function createNodeAttributeUpdater<TContext extends ProcessingContext>(
  nodeId: string | ((context: TContext) => string),
  attribute: string,
  updateFn: (currentValue: any, context: TContext) => any,
): Processor<void, void, TContext> {
  return (_input, context) => {
    const node = typeof nodeId === "function" ? nodeId(context) : nodeId;

    context.graph.updateNodeAttribute(
      node,
      attribute,
      (value: any) => updateFn(value, context),
    );
  };
}

/**
 * Create a processor that transforms graph data to a custom format
 */
export function createNodeTransformer<
  TOutput,
  TContext extends ProcessingContext,
>(
  transformFn: (
    nodeId: string,
    attributes: any,
    connectedNodes: Record<string, NodeWithAttributes[]>,
    context: TContext,
  ) => TOutput,
): Processor<string[], TOutput[], TContext> {
  return (nodeIds, context) => {
    return nodeIds.map((nodeId) => {
      const attributes = context.graph.getNodeAttributes(nodeId);
      const connectedNodes = groupConnectedNodesByType(context.graph, nodeId);
      return transformFn(nodeId, attributes, connectedNodes, context);
    });
  };
}

/**
 * Create a processor that filters items
 */
export function createFilter<TInput>(
  predicate: (item: TInput, index: number) => boolean,
): Processor<TInput[], TInput[]> {
  return (items) => items.filter(predicate);
}

/**
 * Create a processor that maps items
 */
export function createMapper<TInput, TOutput>(
  mapFn: (item: TInput, index: number) => TOutput,
): Processor<TInput[], TOutput[]> {
  return (items) => items.map(mapFn);
}

/**
 * Create a processor that reduces items
 */
export function createReducer<TInput, TOutput>(
  reduceFn: (accumulator: TOutput, item: TInput, index: number) => TOutput,
  initialValue: TOutput,
): Processor<TInput[], TOutput> {
  return (items) => items.reduce(reduceFn, initialValue);
}

/**
 * Create a processor that groups items by a key
 */
export function createGrouper<TInput>(
  keyFn: (item: TInput) => string,
): Processor<TInput[], Record<string, TInput[]>> {
  return (items) => {
    const groups: Record<string, TInput[]> = {};
    for (const item of items) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return groups;
  };
}

/**
 * Create a processor that sorts items
 */
export function createSorter<TInput>(
  compareFn: (a: TInput, b: TInput) => number,
): Processor<TInput[], TInput[]> {
  return (items) => [...items].sort(compareFn);
}

/**
 * Utility to extract edge amounts as a record
 */
export function getEdgeAmounts<TGraph extends DirectedGraph>(
  graph: TGraph,
  sourceNode: string,
  targetNodes: NodeWithAttributes[],
): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const target of targetNodes) {
    amounts[target.id] =
      graph.getEdgeAttribute(sourceNode, target.id, "amount") || 0;
  }
  return amounts;
}

/**
 * Create a batch processor that processes nodes in groups
 */
export function createBatchProcessor<TContext extends ProcessingContext>(
  nodeFilter: (node: string, attributes: any) => boolean,
  processFn: (nodeId: string, context: TContext) => void,
): Processor<void, void, TContext> {
  return (_input, context) => {
    const nodes = context.graph.filterNodes(nodeFilter);
    for (const node of nodes) {
      processFn(node, context);
    }
  };
}

/**
 * Create a conditional processor
 */
export function createConditionalProcessor<
  TInput,
  TOutput,
  TContext extends ProcessingContext,
>(
  condition: (input: TInput, context: TContext) => boolean,
  thenProcessor: Processor<TInput, TOutput, TContext>,
  elseProcessor?: Processor<TInput, TOutput, TContext>,
): Processor<TInput, TOutput, TContext> {
  return (input, context) => {
    if (condition(input, context)) {
      return thenProcessor(input, context);
    } else if (elseProcessor) {
      return elseProcessor(input, context);
    }
    return input as any;
  };
}

/**
 * Create a parallel processor that runs multiple processors and combines results
 */
export function createParallelProcessor<
  TInput,
  TOutput,
  TContext extends ProcessingContext,
>(
  processors: Processor<TInput, any, TContext>[],
  combineFn: (results: any[]) => TOutput,
): Processor<TInput, TOutput, TContext> {
  return (input, context) => {
    const results = processors.map((processor) => processor(input, context));
    return combineFn(results);
  };
}

/**
 * Helper to extract and sum numeric values
 */
export function sumNumericValues(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, val) => sum + val, 0);
}
