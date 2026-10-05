import { describe, expect, it } from "vitest";
import { createMovieProject, addShot, splitShot, type MovieProject } from "./movie";

describe("Movie Studio", () => {
  it("creates a movie project with a starter scene", () => {
    const project = createMovieProject("My Movie");
    expect(project.version).toBe(1);
    expect(project.title).toBe("My Movie");
    expect(project.scenes).toHaveLength(1);
    expect(project.scenes[0].shots).toHaveLength(1);
  });

  it("adds and splits shots without losing timeline order", () => {
    let project = createMovieProject("Timeline Test");
    project = addShot(project, project.scenes[0].id, { title: "Reveal", duration: 6 });
    const scene = project.scenes[0];
    expect(scene.shots).toHaveLength(2);

    project = splitShot(project, scene.id, scene.shots[0].id, 2);
    expect(project.scenes[0].shots).toHaveLength(3);
    expect(project.scenes[0].shots.map((shot) => shot.duration)).toEqual([2, 3, 6]);
  });
});
