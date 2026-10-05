import { createNode, type BoomScene, type NodeType } from "./scene";

export interface BuildCommandResult {
  message: string;
  createdNodeId?: string;
}

export function runBuildCommand(scene: BoomScene, prompt: string): BuildCommandResult {
  const normalized = prompt.trim().toLowerCase();

  if (!normalized) {
    return { message: "Type a build command first." };
  }

  const type = detectType(normalized);
  if (!type) {
    return {
      message:
        "B.O.O.M. Builder v0.1 understands cube, sphere, light, and camera commands for now.",
    };
  }

  const node = createNode(type, detectName(normalized, type));
  node.color = detectColor(normalized, node.color);

  const position = detectPosition(normalized);
  if (position) node.transform.position = position;

  node.parentId = scene.rootId;
  scene.nodes[node.id] = node;
  scene.nodes[scene.rootId].children.push(node.id);

  return {
    message: `Created ${node.name}.`,
    createdNodeId: node.id,
  };
}

function detectType(prompt: string): NodeType | null {
  if (prompt.includes("cube") || prompt.includes("box")) return "cube";
  if (prompt.includes("sphere") || prompt.includes("ball")) return "sphere";
  if (prompt.includes("light")) return "directional-light";
  if (prompt.includes("camera")) return "camera";
  return null;
}

function detectName(prompt: string, type: NodeType): string {
  const match = prompt.match(/called\s+["']?([a-z0-9 _-]+)["']?/i);
  if (match?.[1]) return match[1].trim().replace(/\s+/g, " ");

  const defaultNames: Record<NodeType, string> = {
    scene: "Scene",
    cube: "Generated Cube",
    sphere: "Generated Sphere",
    "directional-light": "Generated Light",
    camera: "Generated Camera",
  };

  return defaultNames[type];
}

function detectColor(prompt: string, fallback: string): string {
  const colors: Record<string, string> = {
    red: "#ef3340",
    blue: "#4f8cff",
    green: "#36d399",
    yellow: "#facc15",
    purple: "#a78bfa",
    orange: "#fb923c",
    white: "#ffffff",
    black: "#111827",
  };

  const found = Object.keys(colors).find((color) => prompt.includes(color));
  return found ? colors[found] : fallback;
}

function detectPosition(prompt: string) {
  const match = prompt.match(/at\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  return {
    x: Number(match[1]),
    y: Number(match[2]),
    z: Number(match[3]),
  };
}
