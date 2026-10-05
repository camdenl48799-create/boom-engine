import { describe, expect, it } from "vitest";
import {
  createDefaultScene,
  createNode,
  deserializeScene,
  serializeScene,
  type BoomScene,
} from "./scene";

describe("B.O.O.M. scene core", () => {
  it("creates a valid default scene with a camera and light", () => {
    const scene = createDefaultScene();

    expect(scene.version).toBe(1);
    expect(scene.rootId).toBe("root");
    expect(scene.nodes.root.type).toBe("scene");
    expect(Object.values(scene.nodes).some((node) => node.type === "camera")).toBe(true);
    expect(Object.values(scene.nodes).some((node) => node.type === "directional-light")).toBe(true);
  });

  it("creates unique object nodes with stable transform defaults", () => {
    const cube = createNode("cube", "Cube");

    expect(cube.id).toMatch(/^node-/);
    expect(cube.type).toBe("cube");
    expect(cube.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(cube.transform.scale).toEqual({ x: 1, y: 1, z: 1 });
  });

  it("round-trips a scene through JSON without losing transforms", () => {
    const scene: BoomScene = createDefaultScene();
    const cube = createNode("cube", "Hero Cube");
    cube.transform.position = { x: 2, y: 3, z: -4 };
    scene.nodes[cube.id] = cube;
    scene.nodes[scene.rootId].children.push(cube.id);

    const restored = deserializeScene(serializeScene(scene));

    expect(restored.nodes[cube.id].name).toBe("Hero Cube");
    expect(restored.nodes[cube.id].transform.position).toEqual({ x: 2, y: 3, z: -4 });
  });
});
