export type Item = {
  id: string;
  name: string;
  type: string;
  description: string;
  weight: number;
  value: number;
  set: string;
  slot: string;
  tier: string;
  attributes: Record<string, number>;
};

export type BaseNodeAttributes = {
  id: string;
  name: string;
  description?: string;
};

export type NonItemNodeAttributes = BaseNodeAttributes & {
  type: "attribute" | "tier" | "slot" | "set";
};
export type ItemNodeAttributes = BaseNodeAttributes & {
  type: "item";
  weight: number;
  value: number;
};

export type NodeAttributes = ItemNodeAttributes | NonItemNodeAttributes;

export type EdgeAttributes = { amount?: number };
