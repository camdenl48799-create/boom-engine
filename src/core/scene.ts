export type NodeType = "scene" | "cube" | "sphere" | "directional-light" | "camera";

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SceneNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  children: string[];
  visible: boolean;
  color: string;
  transform: {
    position: Vector3Like;
    rotation: Vector3Like;
    scale: Vector3Like;
  };
}

export interface BoomScene {
  version: 1;
  rootId: string;
  nodes: Record<string, SceneNode>;
  metadata: {
    name: string;
    engine: "B.O.O.M. Engine";
  };
}

let idCounter = 0;

export function createNode(type: NodeType, name?: string): SceneNode {
  const id = `node-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;

  return {
    id,
    name: name ?? titleForType(type),
    type,
    parentId: null,
    children: [],
    visible: true,
    color: defaultColorForType(type),
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  };
}

export function createDefaultScene(): BoomScene {
  const root: SceneNode = {
    id: "root",
    name: "Main Scene",
    type: "scene",
    parentId: null,
    children: [],
    visible: true,
    color: "#1f2937",
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  };

  const camera = createNode("camera", "Editor Camera");
  camera.transform.position = { x: 8, y: 6, z: 10 };

  const light = createNode("directional-light", "Key Light");
  light.transform.position = { x: 4, y: 8, z: 4 };

  const starterCube = createNode("cube", "Starter Cube");
  starterCube.transform.position = { x: 0, y: 0.8, z: 0 };
  starterCube.parentId = root.id;

  const nodes: Record<string, SceneNode> = {
    root,
    [camera.id]: camera,
    [light.id]: light,
    [starterCube.id]: starterCube,
  };

  camera.parentId = root.id;
  light.parentId = root.id;
  root.children.push(camera.id, light.id, starterCube.id);

  return {
    version: 1,
    rootId: root.id,
    nodes,
    metadata: {
      name: "B.O.O.M. Starter Scene",
      engine: "B.O.O.M. Engine",
    },
  };
}

export function serializeScene(scene: BoomScene): string {
  return JSON.stringify(scene, null, 2);
}

export function deserializeScene(json: string): BoomScene {
  const parsed: unknown = JSON.parse(json);

  if (!isBoomScene(parsed)) {
    throw new Error("Invalid B.O.O.M. scene file.");
  }

  return parsed;
}

function isBoomScene(value: unknown): value is BoomScene {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<BoomScene>;
  return (
    candidate.version === 1 &&
    typeof candidate.rootId === "string" &&
    typeof candidate.nodes === "object" &&
    candidate.nodes !== null
  );
}

function titleForType(type: NodeType): string {
  switch (type) {
    case "cube":
      return "Cube";
    case "sphere":
      return "Sphere";
    case "directional-light":
      return "Directional Light";
    case "camera":
      return "Camera";
    case "scene":
      return "Scene";
  }
}

function defaultColorForType(type: NodeType): string {
  switch (type) {
    case "cube":
      return "#ef3340";
    case "sphere":
      return "#4f8cff";
    case "directional-light":
      return "#fff3bf";
    case "camera":
      return "#b8c5ff";
    case "scene":
      return "#1f2937";
  }
}
