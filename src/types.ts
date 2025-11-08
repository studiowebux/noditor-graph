/**
 * Overwrite with your specific type, Data in the node
 * @example {id: string, name: string, type: string}
 */
export type NodeAttributes = object;

/**
 * Overwrite with your specific type, Data on the edge
 * @example {value: number}
 */
export type EdgeAttributes = object;

export type GraphOutput = {
  nodes: {
    id: string;
  }[];
  links: {
    source: string;
    target: string;
  }[];
};
