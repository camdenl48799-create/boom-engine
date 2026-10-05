import { createNode, type BoomScene, type NodeType, type Vector3Like } from "./scene";

export interface BuildCommandResult {
  message: string;
  createdNodeId?: string;
  affectedNodeId?: string;
}

const COLORS: Record<string, string> = {
  red: "#ef3340", blue: "#4f8cff", green: "#36d399", yellow: "#facc15",
  purple: "#a78bfa", orange: "#fb923c", white: "#ffffff", black: "#111827",
  pink: "#f472b6", cyan: "#22d3ee",
};

export function runBuildCommand(scene: BoomScene, prompt: string): BuildCommandResult {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized) return { message: "Type a build command first." };

  if (/^(delete|remove)\s+/i.test(normalized)) return deleteByName(scene, extractTarget(normalized));
  if (/^rename\s+/i.test(normalized)) return renameByCommand(scene, normalized);
  if (/^(move|position)\s+/i.test(normalized)) return transformByCommand(scene, normalized, "position");
  if (/^rotate\s+/i.test(normalized)) return transformByCommand(scene, normalized, "rotation");
  if (/^scale\s+/i.test(normalized)) return transformByCommand(scene, normalized, "scale");
  if (/^hide\s+/i.test(normalized)) return setVisibility(scene, extractTarget(normalized), false);
  if (/^show\s+/i.test(normalized)) return setVisibility(scene, extractTarget(normalized), true);

  const type = detectType(normalized);
  if (!type) {
    return { message: "B.O.O.M. Builder v0.2 supports add, move, rotate, scale, rename, delete, hide, and show commands." };
  }

  const node = createNode(type, detectName(normalized, type));
  node.color = detectColor(normalized, node.color);
  const position = detectPosition(normalized);
  if (position) node.transform.position = position;

  node.parentId = scene.rootId;
  scene.nodes[node.id] = node;
  scene.nodes[scene.rootId].children.push(node.id);
  return { message: \`Created \${node.name}.\`, createdNodeId: node.id };
}

function detectType(prompt: string): NodeType | null {
  if (prompt.includes("cube") || prompt.includes("box")) return "cube";
  if (prompt.includes("sphere") || prompt.includes("ball")) return "sphere";
  if (prompt.includes("light")) return "directional-light";
  if (prompt.includes("camera")) return "camera";
  return null;
}

function detectName(prompt: string, type: NodeType): string {
  const match = prompt.match(/called\s+["']?([a-z0-9 _-]+?)["']?(?:\s+at\s+|\s+rotate\s+|\s+scale\s+|$)/i);
  if (match?.[1]) return match[1].trim().replace(/\s+/g, " ");
  const names: Record<NodeType, string> = {
    scene: "Scene", cube: "Generated Cube", sphere: "Generated Sphere",
    "directional-light": "Generated Light", camera: "Generated Camera",
  };
  return names[type];
}

function detectColor(prompt: string, fallback: string): string {
  const found = Object.keys(COLORS).find((color) => prompt.includes(color));
  return found ? COLORS[found] : fallback;
}

function detectPosition(prompt: string): Vector3Like | null {
  const match = prompt.match(/\bat\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
}

function extractTarget(prompt: string): string {
  return prompt.replace(/^(delete|remove|hide|show)\s+/i, "").trim().replace(/["']/g, "");
}

function findByName(scene: BoomScene, name: string) {
  return Object.values(scene.nodes).find((node) => node.name.toLowerCase() === name.toLowerCase());
}

function deleteByName(scene: BoomScene, target: string): BuildCommandResult {
  const node = findByName(scene, target);
  if (!node || node.id === scene.rootId) return { message: \`B.O.O.M. couldn't find "\${target}".\` };

  const descendants = collectDescendants(scene, node.id);
  if (node.parentId) {
    scene.nodes[node.parentId].children = scene.nodes[node.parentId].children.filter((id) => id !== node.id);
  }
  for (const id of [node.id, ...descendants]) delete scene.nodes[id];
  return { message: \`Deleted \${node.name}.\`, affectedNodeId: node.id };
}

function collectDescendants(scene: BoomScene, id: string): string[] {
  const node = scene.nodes[id];
  return node ? node.children.flatMap((childId) => [childId, ...collectDescendants(scene, childId)]) : [];
}

function renameByCommand(scene: BoomScene, prompt: string): BuildCommandResult {
  const match = prompt.match(/^rename\s+["']?(.+?)["']?\s+(?:to|as)\s+["']?(.+?)["']?$/i);
  if (!match) return { message: 'Use: rename "Old Name" to "New Name".' };
  const node = findByName(scene, match[1].trim());
  if (!node) return { message: \`B.O.O.M. couldn't find "\${match[1].trim()}".\` };
  const oldName = node.name;
  node.name = match[2].trim();
  return { message: \`Renamed \${oldName} to \${node.name}.\`, affectedNodeId: node.id };
}

function transformByCommand(scene: BoomScene, prompt: string, key: "position" | "rotation" | "scale"): BuildCommandResult {
  const match = prompt.match(/^(?:move|position|rotate|scale)\s+["']?(.+?)["']?\s+(?:to\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/i);
  if (!match) return { message: \`Use: \${key === "position" ? "move" : key} Name x y z.\` };
  const node = findByName(scene, match[1].trim());
  if (!node) return { message: \`B.O.O.M. couldn't find "\${match[1].trim()}".\` };
  node.transform[key] = { x: Number(match[2]), y: Number(match[3]), z: Number(match[4]) };
  const verb = key === "position" ? "Moved" : key === "rotation" ? "Rotated" : "Scaled";
  return { message: \`\${verb} \${node.name}.\`, affectedNodeId: node.id };
}

function setVisibility(scene: BoomScene, target: string, visible: boolean): BuildCommandResult {
  const node = findByName(scene, target);
  if (!node) return { message: \`B.O.O.M. couldn't find "\${target}".\` };
  node.visible = visible;
  return { message: \`\${visible ? "Shown" : "Hidden"} \${node.name}.\`, affectedNodeId: node.id };
}
