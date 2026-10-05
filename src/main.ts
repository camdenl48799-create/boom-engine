import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { createDefaultScene, createNode, deserializeScene, serializeScene, type BoomScene, type SceneNode } from "./core/scene";
import { runBuildCommand } from "./core/commands";
import "./styles.css";

const sceneState: BoomScene = createDefaultScene();
let selectedId = sceneState.rootId;
let playing = false;
let transformMode: "translate" | "rotate" | "scale" = "translate";
let renderer: THREE.WebGLRenderer;
let threeScene: THREE.Scene;
let editorCamera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let transformControls: TransformControls;
let selectionHelper: THREE.BoxHelper | null = null;
let grid: THREE.GridHelper;
const objectMap = new Map<string, THREE.Object3D>();
const builderHistory: string[] = [];
const playRotationSnapshot = new Map<string, THREE.Euler>();
let frameCount = 0;
let lastFpsTime = performance.now();
let fps = 0;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("B.O.O.M. root element missing.");

app.innerHTML = [
  '<div class="boom-shell">',
  '  <header class="topbar">',
  '    <div class="brand"><div class="brand-mark"><span>B</span></div><div><div class="brand-name">B.O.O.M. <span>ENGINE</span></div><div class="brand-subtitle">Build Once. Open More. <b>OVERDRIVE EDITOR</b></div></div></div>',
  '    <div class="project-pill"><span class="pulse-dot"></span> LIVE PROJECT <strong>STARTER</strong></div>',
  '    <div class="top-actions"><button id="new-scene">New</button><button id="save-scene">Save</button><button id="load-scene">Load</button><button id="play-scene" class="primary">▶ Play</button><button id="vr-scene">◈ VR</button></div>',
  '  </header>',
  '  <section class="builder-bar"><div class="ai-badge"><span>✦</span> AI BUILDER</div><div class="builder-input-wrap"><input id="builder-input" autocomplete="off" placeholder="Build something… e.g. add a red cube called Player at 0 1 -3" /><kbd>ENTER</kbd></div><button id="builder-run" class="primary builder-run">Build <span>↵</span></button><div id="builder-status" class="builder-status">Local agent ready • no API key required</div></section>',
  '  <div class="command-strip"><div class="command-group"><span class="command-label">TOOLS</span><button class="tool-button active" data-mode="translate">↔ <b>W</b></button><button class="tool-button" data-mode="rotate">⟳ <b>E</b></button><button class="tool-button" data-mode="scale">⤢ <b>R</b></button><button id="focus-selected" class="tool-button">⌖ <b>F</b></button><button id="toggle-grid" class="tool-button active">▦</button></div><div class="command-group center"><span class="scene-chip">SCENE <b id="scene-name">B.O.O.M. Starter Scene</b></span><span id="mode-chip" class="mode-chip"><span></span> EDIT MODE</span></div><div class="command-group"><span id="viewport-stats" class="viewport-stats">FPS -- · 0 objects · 0 tris</span></div></div>',
  '  <main class="workspace">',
  '    <aside class="panel hierarchy"><div class="panel-heading"><div><span class="heading-icon">☷</span> Hierarchy</div><span id="object-count" class="count-badge">0</span></div><div class="search-box"><span>⌕</span><input id="hierarchy-search" placeholder="Search objects…" /></div><div class="panel-tools"><button data-add="cube">＋ Cube</button><button data-add="sphere">＋ Sphere</button><button data-add="directional-light">＋ Light</button><button data-add="camera">＋ Camera</button></div><div id="hierarchy-list" class="tree"></div><div class="hierarchy-footer"><span class="legend-dot"></span> Scene graph synced</div></aside>',
  '    <section class="viewport-panel"><div class="viewport-glow"></div><div id="viewport" class="viewport"></div><div class="axis-gizmo"><span class="axis-y">Y</span><span class="axis-x">X</span><span class="axis-z">Z</span><i></i></div><div class="viewport-toolbar"><button id="camera-perspective" class="viewport-tool active">Perspective</button><button id="camera-frame">Frame</button></div><div class="viewport-hint"><span><b>LMB</b> Select</span><span><b>MMB</b> Orbit</span><span><b>RMB</b> Pan</span><span><b>W/E/R</b> Transform</span></div></section>',
  '    <aside class="panel inspector"><div class="panel-heading"><div><span class="heading-icon">◫</span> Inspector</div><span class="inspector-live">LIVE</span></div><div id="inspector-content" class="inspector-content"></div></aside>',
  '  </main>',
  '  <section id="builder-history" class="builder-history hidden"></section>',
  '  <footer class="statusbar"><div><span class="status-light"></span><span id="status-text">Ready. B.O.O.M. is standing by.</span></div><div class="status-right"><span>WebGL</span><span>WebXR</span><span>Scene v1</span><strong id="status-mode">EDIT</strong></div></footer>',
  '  <input id="file-input" type="file" accept=".json,application/json" hidden />',
  '</div>'
].join("");

setupRenderer();
renderHierarchy();
renderInspector();
bindUI();
updateStats();
animate();

function setupRenderer() {
  const viewport = document.querySelector<HTMLDivElement>("#viewport")!;
  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color("#070b12");
  threeScene.fog = new THREE.Fog("#070b12", 22, 80);

  editorCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  editorCamera.position.set(8, 6, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.xr.enabled = true;
  viewport.appendChild(renderer.domElement);
  viewport.appendChild(VRButton.createButton(renderer));

  controls = new OrbitControls(editorCamera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.screenSpacePanning = true;
  controls.minDistance = 2;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  transformControls = new TransformControls(editorCamera, renderer.domElement);
  transformControls.setMode(transformMode);
  transformControls.setSize(0.85);
  transformControls.addEventListener("dragging-changed", (event) => {
    controls.enabled = !(event as { value: boolean }).value;
  });
  transformControls.addEventListener("objectChange", syncTransformFromGizmo);
  threeScene.add(transformControls.getHelper());

  const hemi = new THREE.HemisphereLight("#dce8ff", "#0a101b", 1.7);
  threeScene.add(hemi);

  const key = new THREE.DirectionalLight("#ffffff", 3.4);
  key.position.set(6, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 50;
  key.shadow.camera.left = -18;
  key.shadow.camera.right = 18;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  threeScene.add(key);

  const rim = new THREE.PointLight("#e01e2b", 18, 20, 2);
  rim.position.set(-5, 4, -4);
  threeScene.add(rim);

  grid = new THREE.GridHelper(40, 40, "#303d52", "#172130");
  threeScene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: "#090f18", roughness: 0.82, metalness: 0.08 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.015;
  floor.receiveShadow = true;
  floor.userData.editorOnly = true;
  threeScene.add(floor);

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();
  rebuildThreeScene();
}

function resizeRenderer() {
  const viewport = document.querySelector<HTMLDivElement>("#viewport");
  if (!viewport || !renderer) return;
  const width = Math.max(viewport.clientWidth, 1);
  const height = Math.max(viewport.clientHeight, 1);
  renderer.setSize(width, height, false);
  editorCamera.aspect = width / height;
  editorCamera.updateProjectionMatrix();
}

function rebuildThreeScene() {
  transformControls.detach();
  for (const [id, object] of objectMap) {
    threeScene.remove(object);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
    objectMap.delete(id);
  }

  for (const node of Object.values(sceneState.nodes)) {
    if (node.type === "scene") continue;
    const object = objectForNode(node);
    if (!object) continue;
    applyTransform(object, node);
    object.visible = node.visible;
    object.userData.nodeId = node.id;
    threeScene.add(object);
    objectMap.set(node.id, object);
  }
  updateSelectionVisuals();
  updateObjectCount();
}

function objectForNode(node: SceneNode): THREE.Object3D | null {
  if (node.type === "cube") {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: node.color, roughness: 0.38, metalness: 0.16 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  if (node.type === "sphere") {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 40, 24),
      new THREE.MeshStandardMaterial({ color: node.color, roughness: 0.32, metalness: 0.18 })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  if (node.type === "directional-light") {
    const light = new THREE.DirectionalLight(node.color, 4);
    const helper = new THREE.DirectionalLightHelper(light, 0.7, "#fff3bf");
    light.add(helper);
    return light;
  }
  if (node.type === "camera") {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.lookAt(0, 0, 0);
    return new THREE.CameraHelper(camera);
  }
  return null;
}

function applyTransform(object: THREE.Object3D, node: SceneNode) {
  object.position.set(node.transform.position.x, node.transform.position.y, node.transform.position.z);
  object.rotation.set(
    THREE.MathUtils.degToRad(node.transform.rotation.x),
    THREE.MathUtils.degToRad(node.transform.rotation.y),
    THREE.MathUtils.degToRad(node.transform.rotation.z)
  );
  object.scale.set(node.transform.scale.x, node.transform.scale.y, node.transform.scale.z);
}

function renderHierarchy() {
  const list = document.querySelector<HTMLDivElement>("#hierarchy-list")!;
  const query = document.querySelector<HTMLInputElement>("#hierarchy-search")?.value.trim().toLowerCase() ?? "";
  const nodes = Object.values(sceneState.nodes).filter((node) =>
    !query || node.name.toLowerCase().includes(query) || node.type.includes(query)
  );

  list.innerHTML = nodes.map((node) => {
    const selected = node.id === selectedId ? "selected" : "";
    const visibility = node.type === "scene" ? "" : '<button class="row-eye" data-toggle-visible="' + node.id + '">' + (node.visible ? "◉" : "○") + "</button>";
    return '<div class="tree-row ' + selected + '" data-select="' + node.id + '"><button class="tree-item"><span class="tree-chevron">' + (node.type === "scene" ? "⌄" : "·") + '</span><span class="tree-icon ' + node.type + '">' + iconForType(node.type) + '</span><span class="tree-name">' + escapeHtml(node.name) + '</span><span class="tree-type">' + (node.type === "directional-light" ? "light" : node.type) + "</span></button>" + visibility + "</div>";
  }).join("");

  list.querySelectorAll<HTMLElement>("[data-select]").forEach((row) => row.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("[data-toggle-visible]")) return;
    selectedId = row.dataset.select!;
    updateSelectionVisuals();
    renderHierarchy();
    renderInspector();
  }));

  list.querySelectorAll<HTMLButtonElement>("[data-toggle-visible]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const node = sceneState.nodes[button.dataset.toggleVisible!];
    if (!node) return;
    node.visible = !node.visible;
    syncThreeObject(node);
    renderHierarchy();
    renderInspector();
  }));
}

function renderInspector() {
  const container = document.querySelector<HTMLDivElement>("#inspector-content")!;
  const node = sceneState.nodes[selectedId];
  if (!node) {
    container.innerHTML = '<div class="empty-inspector"><div>◇</div><b>Nothing selected</b><span>Select an object in the viewport or hierarchy.</span></div>';
    return;
  }

  const appearance = node.type === "cube" || node.type === "sphere"
    ? '<details open><summary><span>APPEARANCE</span><i>⌃</i></summary><div class="detail-body"><label>Base Color<div class="color-control"><input id="node-color" type="color" value="' + node.color + '" /><code>' + node.color + '</code></div></label><div class="swatches">' +
      ["#ef3340","#4f8cff","#36d399","#facc15","#a78bfa","#22d3ee"].map((color) => '<button data-color="' + color + '" style="--swatch:' + color + '"></button>').join("") +
      "</div></div></details>" : "";

  container.innerHTML =
    '<div class="selected-card"><div class="selected-icon ' + node.type + '">' + iconForType(node.type) + '</div><div><div class="selected-name">' + escapeHtml(node.name) + '</div><div class="selected-id">' + node.type.toUpperCase() + " • " + node.id.slice(-8) + "</div></div></div>" +
    '<details open><summary><span>IDENTITY</span><i>⌃</i></summary><div class="detail-body"><label>Name<input id="node-name" value="' + escapeAttr(node.name) + '" /></label><div class="property-line"><span>Type</span><b>' + node.type + '</b></div><label class="check-row"><input id="node-visible" type="checkbox" ' + (node.visible ? "checked" : "") + '> Visible in scene</label></div></details>' +
    '<details open><summary><span>TRANSFORM</span><i>⌃</i></summary><div class="detail-body">' +
      vectorFields("Position", "position", node.transform.position) +
      vectorFields("Rotation", "rotation", node.transform.rotation) +
      vectorFields("Scale", "scale", node.transform.scale) +
      '<div class="snap-row"><span>Snap</span><button data-snap="0.25">0.25</button><button data-snap="1">1</button><button data-snap="5">5</button></div>' +
    "</div></details>" + appearance +
    '<div class="inspector-actions">' + (node.type !== "scene" ? '<button id="duplicate-node">⧉ Duplicate</button><button id="delete-node" class="danger">Delete</button>' : '<div class="scene-note">Root scene • protected</div>') + "</div>";

  bindInspector(node);
}

function vectorFields(label: string, key: "position" | "rotation" | "scale", value: { x: number; y: number; z: number }) {
  return '<div class="vector-label">' + label + '</div><div class="vector-row">' +
    (["x", "y", "z"] as const).map((axis) =>
      '<label class="axis-label axis-' + axis + '">' + axis.toUpperCase() + '<input data-transform="' + key + '" data-axis="' + axis + '" type="number" step="0.1" value="' + value[axis] + '" /></label>'
    ).join("") + "</div>";
}

function bindInspector(node: SceneNode) {
  document.querySelector<HTMLInputElement>("#node-name")?.addEventListener("change", (event) => {
    node.name = (event.target as HTMLInputElement).value.trim() || node.name;
    renderHierarchy();
    renderInspector();
    setStatus("Renamed object to " + node.name + ".");
  });

  document.querySelectorAll<HTMLInputElement>("[data-transform]").forEach((input) => input.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    const key = target.dataset.transform as "position" | "rotation" | "scale";
    const axis = target.dataset.axis as "x" | "y" | "z";
    const value = Number(target.value);
    if (!Number.isFinite(value)) return;
    node.transform[key][axis] = value;
    syncThreeObject(node);
    refreshSelectionHelper();
  }));

  document.querySelector<HTMLInputElement>("#node-color")?.addEventListener("input", (event) => {
    node.color = (event.target as HTMLInputElement).value;
    syncThreeObject(node);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((button) => button.addEventListener("click", () => {
    node.color = button.dataset.color!;
    syncThreeObject(node);
    renderInspector();
  }));

  document.querySelector<HTMLInputElement>("#node-visible")?.addEventListener("change", (event) => {
    node.visible = (event.target as HTMLInputElement).checked;
    syncThreeObject(node);
    renderHierarchy();
  });

  document.querySelectorAll<HTMLButtonElement>("[data-snap]").forEach((button) => button.addEventListener("click", () => {
    const value = Number(button.dataset.snap);
    transformControls.setTranslationSnap(value);
    transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
    transformControls.setScaleSnap(value / 4);
    setStatus("Transform snap set to " + value + ".");
  }));

  document.querySelector("#delete-node")?.addEventListener("click", () => deleteNode(node.id));
  document.querySelector("#duplicate-node")?.addEventListener("click", () => duplicateNode(node.id));
}

function syncThreeObject(node: SceneNode) {
  const object = objectMap.get(node.id);
  if (!object) {
    rebuildThreeScene();
    return;
  }
  applyTransform(object, node);
  object.visible = node.visible;
  if (node.type === "cube" || node.type === "sphere") {
    (object as THREE.Mesh).material && ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(node.color);
  }
  refreshSelectionHelper();
}

function syncTransformFromGizmo() {
  const object = transformControls.object;
  if (!object) return;
  const id = object.userData.nodeId as string | undefined;
  if (!id) return;
  const node = sceneState.nodes[id];
  if (!node) return;
  node.transform.position.set(object.position);
  node.transform.rotation.set(
    THREE.MathUtils.radToDeg(object.rotation.x),
    THREE.MathUtils.radToDeg(object.rotation.y),
    THREE.MathUtils.radToDeg(object.rotation.z)
  );
  node.transform.scale.set(object.scale);
  renderInspector();
  refreshSelectionHelper();
}

function addNode(type: "cube" | "sphere" | "directional-light" | "camera") {
  const node = createNode(type);
  node.parentId = sceneState.rootId;
  const offset = sceneState.nodes[sceneState.rootId].children.length * 0.45;
  node.transform.position = { x: offset, y: type === "directional-light" ? 4 : type === "camera" ? 2 : 0.8, z: -offset };
  sceneState.nodes[node.id] = node;
  sceneState.nodes[sceneState.rootId].children.push(node.id);
  selectedId = node.id;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus("Added " + node.name + ".");
}

function duplicateNode(id: string) {
  const source = sceneState.nodes[id];
  if (!source || source.type === "scene") return;
  const clone = createNode(source.type, source.name + " Copy");
  clone.color = source.color;
  clone.visible = source.visible;
  clone.transform = {
    position: { ...source.transform.position, x: source.transform.position.x + 1 },
    rotation: { ...source.transform.rotation },
    scale: { ...source.transform.scale }
  };
  clone.parentId = source.parentId;
  sceneState.nodes[clone.id] = clone;
  sceneState.nodes[source.parentId ?? sceneState.rootId].children.push(clone.id);
  selectedId = clone.id;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus("Duplicated " + source.name + ".");
}

function deleteNode(id: string) {
  const node = sceneState.nodes[id];
  if (!node || node.id === sceneState.rootId) return;
  for (const childId of [...node.children]) deleteNode(childId);
  if (node.parentId) sceneState.nodes[node.parentId].children = sceneState.nodes[node.parentId].children.filter((child) => child !== id);
  delete sceneState.nodes[id];
  selectedId = sceneState.rootId;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus("Deleted " + node.name + ".");
}

function updateSelectionVisuals() {
  if (selectionHelper) {
    threeScene.remove(selectionHelper);
    selectionHelper = null;
  }
  transformControls.detach();
  if (selectedId === sceneState.rootId) return;
  const object = objectMap.get(selectedId);
  if (!object) return;
  selectionHelper = new THREE.BoxHelper(object, "#e01e2b");
  threeScene.add(selectionHelper);
  transformControls.attach(object);
  transformControls.setMode(transformMode);
}

function refreshSelectionHelper() {
  selectionHelper?.update();
}

function selectFromViewport(event: PointerEvent) {
  if (event.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, editorCamera);
  const hit = raycaster.intersectObjects([...objectMap.values()].filter((object) => object.visible), true)[0];
  if (!hit) return;
  let current: THREE.Object3D | null = hit.object;
  while (current && current.userData.nodeId === undefined) current = current.parent;
  const id = current?.userData.nodeId as string | undefined;
  if (!id || !sceneState.nodes[id]) return;
  selectedId = id;
  updateSelectionVisuals();
  renderHierarchy();
  renderInspector();
}

function setTransformMode(mode: typeof transformMode) {
  transformMode = mode;
  transformControls.setMode(mode);
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
  setStatus(mode[0].toUpperCase() + mode.slice(1) + " tool active.");
}

function focusSelected() {
  const object = objectMap.get(selectedId);
  if (!object) return;
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() * 0.65, 2);
  const direction = editorCamera.position.clone().sub(controls.target).normalize();
  controls.target.copy(center);
  editorCamera.position.copy(center).add(direction.multiplyScalar(radius));
  controls.update();
  setStatus("Focused " + (sceneState.nodes[selectedId]?.name ?? "selection") + ".");
}

function runBuilder(prompt: string) {
  const result = runBuildCommand(sceneState, prompt);
  document.querySelector("#builder-status")!.textContent = result.message;
  if (!prompt.trim()) return;
  builderHistory.unshift(prompt.trim());
  builderHistory.splice(6);
  renderBuilderHistory();
  if (result.createdNodeId || result.affectedNodeId) {
    selectedId = result.createdNodeId ?? result.affectedNodeId!;
    rebuildThreeScene();
    renderHierarchy();
    renderInspector();
  }
  setStatus(result.message);
  document.querySelector<HTMLInputElement>("#builder-input")!.value = "";
}

function renderBuilderHistory() {
  const history = document.querySelector<HTMLDivElement>("#builder-history")!;
  if (!builderHistory.length) {
    history.classList.add("hidden");
    return;
  }
  history.classList.remove("hidden");
  history.innerHTML = builderHistory.map((command) => '<button data-history="' + escapeAttr(command) + '">↳ ' + escapeHtml(command) + "</button>").join("");
  history.querySelectorAll<HTMLButtonElement>("[data-history]").forEach((button) => button.addEventListener("click", () => {
    const input = document.querySelector<HTMLInputElement>("#builder-input")!;
    input.value = button.dataset.history ?? "";
    input.focus();
  }));
}

function togglePlay() {
  playing = !playing;
  if (playing) {
    playRotationSnapshot.clear();
    for (const [id, object] of objectMap) playRotationSnapshot.set(id, object.rotation.clone());
    setStatus("Play mode enabled • scene simulation running.");
  } else {
    for (const [id, rotation] of playRotationSnapshot) {
      const object = objectMap.get(id);
      const node = sceneState.nodes[id];
      if (!object || !node) continue;
      object.rotation.copy(rotation);
      node.transform.rotation = {
        x: THREE.MathUtils.radToDeg(rotation.x),
        y: THREE.MathUtils.radToDeg(rotation.y),
        z: THREE.MathUtils.radToDeg(rotation.z)
      };
    }
    playRotationSnapshot.clear();
    setStatus("Play mode stopped • editor state restored.");
  }
  updatePlayUI();
}

function updatePlayUI() {
  const button = document.querySelector<HTMLButtonElement>("#play-scene")!;
  const chip = document.querySelector("#mode-chip")!;
  const mode = document.querySelector("#status-mode")!;
  button.textContent = playing ? "■ Stop" : "▶ Play";
  button.classList.toggle("danger", playing);
  chip.className = playing ? "mode-chip playing" : "mode-chip";
  chip.innerHTML = playing ? "<span></span> PLAY MODE" : "<span></span> EDIT MODE";
  mode.textContent = playing ? "PLAY" : "EDIT";
}

function bindUI() {
  document.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((button) => button.addEventListener("click", () => addNode(button.dataset.add as "cube" | "sphere" | "directional-light" | "camera")));
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => button.addEventListener("click", () => setTransformMode(button.dataset.mode as typeof transformMode)));
  document.querySelector("#focus-selected")?.addEventListener("click", focusSelected);
  document.querySelector("#camera-frame")?.addEventListener("click", focusSelected);
  document.querySelector("#toggle-grid")?.addEventListener("click", () => {
    grid.visible = !grid.visible;
    document.querySelector("#toggle-grid")?.classList.toggle("active", grid.visible);
  });
  document.querySelector("#new-scene")?.addEventListener("click", resetScene);
  document.querySelector("#save-scene")?.addEventListener("click", saveScene);
  document.querySelector("#load-scene")?.addEventListener("click", () => document.querySelector<HTMLInputElement>("#file-input")?.click());
  document.querySelector("#file-input")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) loadSceneFromFile(file);
  });
  document.querySelector("#play-scene")?.addEventListener("click", togglePlay);
  document.querySelector("#vr-scene")?.addEventListener("click", () => document.querySelector<HTMLButtonElement>(".webxr-button")?.click());
  const builderInput = document.querySelector<HTMLInputElement>("#builder-input")!;
  document.querySelector("#builder-run")?.addEventListener("click", () => runBuilder(builderInput.value));
  builderInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runBuilder(builderInput.value);
    if (event.key === "Escape") builderInput.value = "";
  });
  document.querySelector("#hierarchy-search")?.addEventListener("input", renderHierarchy);
  renderer.domElement.addEventListener("pointerdown", selectFromViewport);
  window.addEventListener("keydown", handleKeyboard);
}

function handleKeyboard(event: KeyboardEvent) {
  const tag = (event.target as HTMLElement)?.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA";
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveScene();
    return;
  }
  if (typing) return;
  const key = event.key.toLowerCase();
  if (key === "w") setTransformMode("translate");
  if (key === "e") setTransformMode("rotate");
  if (key === "r") setTransformMode("scale");
  if (key === "f") focusSelected();
  if (key === "delete" || key === "backspace") deleteNode(selectedId);
  if (key === "f6") togglePlay();
  if (key === "escape") {
    transformControls.detach();
    selectedId = sceneState.rootId;
    updateSelectionVisuals();
    renderHierarchy();
    renderInspector();
  }
}

function resetScene() {
  const fresh = createDefaultScene();
  Object.assign(sceneState, fresh);
  selectedId = sceneState.rootId;
  playing = false;
  document.querySelector("#scene-name")!.textContent = fresh.metadata.name;
  updatePlayUI();
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus("New B.O.O.M. scene created.");
}

function saveScene() {
  const blob = new Blob([serializeScene(sceneState)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "boom-scene.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Scene exported as boom-scene.json.");
}

function loadSceneFromFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const loaded = deserializeScene(String(reader.result));
      Object.assign(sceneState, loaded);
      selectedId = loaded.rootId;
      document.querySelector("#scene-name")!.textContent = loaded.metadata.name;
      rebuildThreeScene();
      renderHierarchy();
      renderInspector();
      setStatus("Loaded " + loaded.metadata.name + ".");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load scene.");
    }
  };
  reader.readAsText(file);
}

function updateObjectCount() {
  const count = Object.values(sceneState.nodes).filter((node) => node.type !== "scene").length;
  document.querySelector("#object-count")!.textContent = String(count);
}

function updateStats() {
  const objects = Object.values(sceneState.nodes).filter((node) => node.type !== "scene").length;
  const triangles = renderer?.info.render.triangles ?? 0;
  document.querySelector("#viewport-stats")!.textContent = "FPS " + (fps || "--") + " · " + objects + " objects · " + triangles.toLocaleString() + " tris";
}

function animate() {
  renderer.setAnimationLoop(() => {
    controls.update();
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 500) {
      fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      frameCount = 0;
      lastFpsTime = now;
      updateStats();
    }
    if (playing) {
      for (const [id, object] of objectMap) {
        const node = sceneState.nodes[id];
        if ((node?.type === "cube" || node?.type === "sphere") && object.visible) {
          object.rotation.y += 0.006;
          object.rotation.x += 0.0015;
        }
      }
    }
    refreshSelectionHelper();
    renderer.render(threeScene, editorCamera);
  });
}

function setStatus(message: string) {
  document.querySelector("#status-text")!.textContent = message;
}

function iconForType(type: SceneNode["type"]) {
  switch (type) {
    case "scene": return "◆";
    case "cube": return "□";
    case "sphere": return "●";
    case "directional-light": return "☀";
    case "camera": return "▣";
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
