# B.O.O.M. Engine 1.0

**Build Once. Open More.**

B.O.O.M. Engine is a browser-based 3D creation prototype that now brings **Game Studio, Movie Mode, Chat Studio, and an expandable Add-on system** into one workspace.

## B.O.O.M. Hub

The engine opens with a central Hub for:
- Chat Studio
- Game Studio
- Movie Mode
- Add-on Manager
- Recent projects

## Movie Mode

Movie Mode provides an editable cinematic workflow:
- Storyboard and scenes
- Shot-based timeline
- Cinematic shot creation
- Camera and director metadata
- AI Director prompt workflow
- Movie-specific add-ons
- Movie project JSON export
- Shared project concept with Game Studio

The current prototype focuses on real editable cinematic data and preview UI. Full one-click MP4 rendering requires a dedicated video-rendering pipeline and is intentionally not faked.

## Add-ons

B.O.O.M. has an expandable add-on architecture. Built-in expansion points include:
- Cinematic Cameras+
- Director AI+
- Actor & Animation+
- Cinematic Lighting+
- Audio Studio+
- World Builder+
- Performance Pack
- VR Creator+
- Render Studio+

Add-ons expose explicit permissions and can be enabled or disabled independently.

## Game Studio

The original editor remains available with:
- Three.js 3D viewport
- Scene hierarchy
- Inspector
- Transform gizmos
- Object creation and editing
- Local AI Builder
- Play mode
- WebXR entry point
- Scene save/load

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

## Architecture

```text
src/
├── addons/
│   ├── addons.ts
│   └── addons.test.ts
├── core/
│   ├── scene.ts
│   ├── commands.ts
│   └── commands.test.ts
├── movie/
│   ├── movie.ts
│   └── movie.test.ts
├── studio.ts
├── main.ts
└── styles.css
```

The movie and add-on data layers are deliberately separated from the existing editor so future releases can expand them without replacing the working Game Studio.

## Roadmap

Future B.O.O.M. releases can expand the Movie Mode timeline, actor animation, cinematic cameras, audio, VFX, project packaging, plugin/add-on distribution, AI providers, VR filmmaking, and native/high-quality video rendering.
