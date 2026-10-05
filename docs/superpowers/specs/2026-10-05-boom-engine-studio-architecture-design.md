# B.O.O.M. Engine 1.0 Studio Architecture Design

## Goal
Turn the current 1.0 prototype into a coherent multi-studio application without replacing the working Three.js Game Studio.

## 1. Unified Studio State
Create a shared project state module that owns the active studio, movie project, add-on registry, chat history, selected movie shot, and persistence metadata. Studio navigation reads/writes this state instead of keeping independent local state.

## 2. Chat Studio
Add a real project-aware chat surface with conversation history, clear/send controls, and a provider abstraction. The first provider is a deterministic local fallback so the UI never pretends an external model is connected. External providers can be added later through the interface.

## 3. Movie Mode
Upgrade movie data and UI around selectable shots and scenes. Support selecting a shot, adding shots, splitting shots, deleting shots, changing shot metadata, playback state, and a visible playhead. Keep MP4 rendering explicitly out of scope until a real rendering pipeline exists.

## 4. Cinematic Camera Data
Give shots structured camera metadata (camera name, lens, framing, movement) while preserving compatibility with existing movie files. The UI should expose the metadata without requiring a real cinematic renderer yet.

## 5. Add-on Architecture
Replace simple toggle-only records with manifests and a manager/lifecycle abstraction. Add-ons declare permissions and extension points. Enabling/disabling is immutable and validated. Built-ins remain safe data modules; no arbitrary remote code execution is introduced.

## 6. Persistence and Migration
Introduce a versioned unified project format with serialize/deserialize helpers and migration from the existing movie format. Invalid files must fail clearly instead of corrupting in-memory state.

## 7. Tests First
Add failing tests before implementation for:
- studio state/navigation
- movie CRUD and playback state
- cinematic camera metadata
- add-on manifest/permission/lifecycle behavior
- chat provider fallback
- project serialization/migration

Existing scene, command, movie, and add-on tests must continue to pass.

## 8. UI Integration
Fix Hub navigation so Chat opens Chat Studio, Game returns to the underlying Game Studio, Movie opens Movie Mode, and Add-ons opens the manager. Avoid duplicate renderers/listeners and keep the existing editor intact.

## 9. Error Handling
User-facing operations should report failures through the existing status bar. Provider failures must fall back cleanly. File loading must validate schema/version before replacing state.

## 10. Non-Goals
No fake AI network connection, no fake MP4 export, no Electron rewrite, no replacement of the existing Three.js editor, and no arbitrary plugin code execution.

## 11. Acceptance Criteria
- Every Hub card opens a working destination.
- Chat can send messages and preserve conversation state using the local provider.
- Movie shots can be selected, added, split, deleted, edited, and played back in the UI.
- Shot camera metadata is persisted.
- Add-ons have manifests, permissions, lifecycle state, and tests.
- Unified project save/load round-trips state and migrates the old movie format.
- Existing Game Studio functionality remains available.
- Tests and TypeScript/build checks are run and reported honestly.
