# B.O.O.M. Engine

## v0.2 Overdrive Editor

The first major editor upgrade adds a futuristic engine workspace, Three.js transform gizmos, selection outlines, searchable hierarchy, live inspector controls, grid and camera tools, scene statistics, play-mode snapshots, WebXR entry, and a richer local AI Builder.

B.O.O.M. Engine (Build Once. Open More.) is the first working prototype of the B.O.O.M. game-engine/editor concept.

## v0.2 prototype

- 3D editor viewport powered by Three.js
- Scene hierarchy
- Inspector for transforms, visibility, names, and colors
- Cube, sphere, light, and camera creation
- Local AI Builder command parser (no API key required)
- JSON scene save/load
- Play mode
- WebXR/VR entry point
- Unit-tested scene serialization/core data model

## Run locally

```bash
npm install
npm test
npm run build
npm run dev
```

Then open the Vite URL shown in the terminal.

## Example AI Builder commands

- `add a red cube called Player at 0 1 -3`
- `add a blue sphere called Ball`
- `add a light`
- `add a camera`

## Roadmap

The v0.1 editor is intentionally small. The next engine layers can add a real asset pipeline, PBR materials, physics, terrain, scripting, project/package export, Steamworks tooling, Meta publishing helpers, and a native desktop shell without Electron.
