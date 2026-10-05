export type AddonCategory = "Movie" | "Game" | "AI" | "Tools";

export interface BoomAddon {
  id: string;
  name: string;
  version: string;
  category: AddonCategory;
  description: string;
  enabled: boolean;
  builtIn: boolean;
  permissions: string[];
}

export function getDefaultAddons(): BoomAddon[] {
  return [
    { id: "cinematic-cameras", name: "Cinematic Cameras+", version: "1.0.0", category: "Movie", description: "Advanced camera rigs, paths, focus and lens controls.", enabled: false, builtIn: true, permissions: ["readProject", "writeMovie"] },
    { id: "director-ai", name: "Director AI+", version: "1.0.0", category: "AI", description: "Expanded AI-assisted movie planning and directing tools.", enabled: false, builtIn: true, permissions: ["readProject", "writeMovie", "aiTools"] },
    { id: "actor-animation", name: "Actor & Animation+", version: "1.0.0", category: "Movie", description: "Expanded actor direction and animation workflows.", enabled: false, builtIn: true, permissions: ["readScene", "writeScene", "writeMovie"] },
    { id: "cinematic-lighting", name: "Cinematic Lighting+", version: "1.0.0", category: "Movie", description: "Lighting presets designed for cinematic scenes.", enabled: false, builtIn: true, permissions: ["readScene", "writeScene"] },
    { id: "audio-studio", name: "Audio Studio+", version: "1.0.0", category: "Movie", description: "Expanded dialogue, music and sound-effect timeline tools.", enabled: false, builtIn: true, permissions: ["readProject", "writeMovie"] },
    { id: "world-builder", name: "World Builder+", version: "1.0.0", category: "Game", description: "Advanced environment and world-building workflows.", enabled: false, builtIn: true, permissions: ["readScene", "writeScene"] },
    { id: "performance-pack", name: "Performance Pack", version: "1.0.0", category: "Tools", description: "Extra profiling and optimization utilities.", enabled: false, builtIn: true, permissions: ["readProject"] },
    { id: "vr-creator", name: "VR Creator+", version: "1.0.0", category: "Game", description: "Expanded VR creation and interaction tools.", enabled: false, builtIn: true, permissions: ["readScene", "writeScene"] },
    { id: "render-studio", name: "Render Studio+", version: "1.0.0", category: "Movie", description: "Higher-quality cinematic preview and rendering controls.", enabled: false, builtIn: true, permissions: ["readProject", "writeMovie"] },
  ];
}

export function toggleAddon(addons: BoomAddon[], addonId: string, enabled: boolean): BoomAddon[] {
  return addons.map((addon) => addon.id === addonId ? { ...addon, enabled } : addon);
}
