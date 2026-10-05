import { describe, expect, it } from "vitest";
import { createDefaultScene, createNode } from "./scene";
import { runBuildCommand } from "./commands";

describe("B.O.O.M. Builder commands", () => {
  it("creates a named colored object at an explicit position", () => {
    const scene = createDefaultScene();
    const result = runBuildCommand(scene, 'add a red cube called Player at 1 2 -3');

    expect(result.createdNodeId).toBeTruthy();
    const node = scene.nodes[result.createdNodeId!];
    expect(node.name).toBe("Player");
    expect(node.type).toBe("cube");
    expect(node.color).toBe("#ef3340");
    expect(node.transform.position).toEqual({ x: 1, y: 2, z: -3 });
  });

  it("moves, rotates, and scales an existing node by name", () => {
    const scene = createDefaultScene();
    const cube = createNode("cube", "Hero");
    scene.nodes[cube.id] = cube;
    scene.nodes.root.children.push(cube.id);

    expect(runBuildCommand(scene, "move Hero to 2 3 4").message).toContain("Moved Hero");
    expect(cube.transform.position).toEqual({ x: 2, y: 3, z: 4 });

    expect(runBuildCommand(scene, "rotate Hero 10 20 30").message).toContain("Rotated Hero");
    expect(cube.transform.rotation).toEqual({ x: 10, y: 20, z: 30 });

    expect(runBuildCommand(scene, "scale Hero 2 3 4").message).toContain("Scaled Hero");
    expect(cube.transform.scale).toEqual({ x: 2, y: 3, z: 4 });
  });

  it("can hide and show an existing node", () => {
    const scene = createDefaultScene();
    const sphere = createNode("sphere", "Ball");
    scene.nodes[sphere.id] = sphere;
    scene.nodes.root.children.push(sphere.id);

    expect(runBuildCommand(scene, "hide Ball").message).toContain("Hidden Ball");
    expect(sphere.visible).toBe(false);

    expect(runBuildCommand(scene, "show Ball").message).toContain("Shown Ball");
    expect(sphere.visible).toBe(true);
  });

  it("reports unknown object names instead of silently changing the scene", () => {
    const scene = createDefaultScene();
    const result = runBuildCommand(scene, "move Missing to 1 2 3");

    expect(result.createdNodeId).toBeUndefined();
    expect(result.message).toContain("couldn't find");
  });
});
