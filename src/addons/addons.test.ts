import { describe, expect, it } from "vitest";
import { getDefaultAddons, toggleAddon } from "./addons";

describe("B.O.O.M. Add-ons", () => {
  it("ships with Movie Mode expansion add-ons", () => {
    const addons = getDefaultAddons();
    expect(addons.some((addon) => addon.id === "cinematic-cameras")).toBe(true);
    expect(addons.some((addon) => addon.id === "director-ai")).toBe(true);
  });

  it("can enable and disable an add-on immutably", () => {
    const addons = getDefaultAddons();
    const next = toggleAddon(addons, "cinematic-cameras", true);
    expect(next.find((addon) => addon.id === "cinematic-cameras")?.enabled).toBe(true);
    expect(addons.find((addon) => addon.id === "cinematic-cameras")?.enabled).toBe(false);
  });
});
