import { createGraph } from "../src/mod.ts";
import { EdgeAttributes, NodeAttributes } from "./sword.type.ts";

export const graph = createGraph<
  NodeAttributes,
  EdgeAttributes
>();

const basic = graph.addNode("basic", {
  id: "basic",
  name: "Basic",
  type: "set",
  description: "Nothing Special",
});

const mainHand = graph.addNode("main_hand", {
  id: "main_hand",
  name: "Main Hand",
  type: "slot",
  description: "One Hand Item",
});

const normal = graph.addNode("normal", {
  id: "normal",
  name: "Normal",
  type: "tier",
  description: "Nothing Special",
});

const advanced = graph.addNode("advanced", {
  id: "advanced",
  name: "Advanced",
  type: "tier",
  description: "Better than Nothing",
});

const speed = graph.addNode("speed", {
  id: "speed",
  name: "Speed",
  type: "attribute",
  description: "Determines who attacks first",
});

const attack = graph.addNode("attack", {
  id: "attack",
  name: "Attack",
  type: "attribute",
  description: "Define Damage dealt",
});

const sword1 = graph.addNode(
  "sword_1",
  {
    id: "sword_1",
    name: "Sword I",
    type: "item",
    description: "Starter Sword",
    weight: 1,
    value: 5,
  },
);

const sword2 = graph.addNode(
  "sword_2",
  {
    id: "sword_2",
    name: "Sword II",
    type: "item",
    description: "Intermediary Sword",
    weight: 1,
    value: 10,
  },
);

const edgeSword1Attack = graph.addEdge("sword_1", "attack", { amount: 5 });
const edgeSword1Speed = graph.addEdge("sword_1", "speed", { amount: 1 });
const edgeSword1Normal = graph.addEdge("sword_1", "normal");
const edgeSword1LeftHand = graph.addEdge("sword_1", "main_hand");
const edgeSword1Basic = graph.addEdge("sword_1", "basic");

const edgeSword2Attack = graph.addEdge("sword_2", "attack", { amount: 10 });
const edgeSword2Speed = graph.addEdge("sword_2", "speed", { amount: 2 });
const edgeSword2Advanced = graph.addEdge("sword_2", "advanced");
const edgeSword2LeftHand = graph.addEdge("sword_2", "main_hand");
const edgeSword2Basic = graph.addEdge("sword_2", "basic");
