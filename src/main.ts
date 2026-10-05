import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { createDefaultScene, createNode, deserializeScene, serializeScene, type BoomScene, type SceneNode } from "./core/scene";
import { runBuildCommand } from "./core/commands";
import "./styles.css";

const sceneState: BoomScene = createDefaultScene();
let selectedId = sceneState.rootId;
let playing = false;
let renderer: THREE.WebGLRenderer;
let threeScene: THREE.Scene;
let editorCamera: THREE.PerspectiveCamera;
let controls: OrbitControls;
const objectMap = new Map<string, THREE.Object3D>();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("B.O.O.M. root element missing.");

app.innerHTML = `
  <div class="boom-shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">B</div>
        <div>
          <div class="brand-name">B.O.O.M. Engine</div>
          <div class="brand-subtitle">v0.1 • Build Once. Open More.</div>
        </div>
      </div>
      <div class="top-actions">
        <button id="new-scene">New</button>
        <button id="save-scene">Save</button>
        <button id="load-scene">Load</button>
        <button id="play-scene" class="primary">▶ Play</button>
        <button id="vr-scene">VR</button>
      </div>
    </header>

    <section class="builder-bar">
      <div class="builder-title">AI Builder</div>
      <input id="builder-input" placeholder='Try: "add a red cube called Player at 0 1 -3"' />
      <button id="builder-run" class="primary">Build</button>
      <span id="builder-status">Local builder • no API key required</span>
    </section>

    <main class="workspace">
      <aside class="panel hierarchy">
        <div class="panel-heading">Hierarchy</div>
        <div class="panel-tools">
          <button data-add="cube">+ Cube</button>
          <button data-add="sphere">+ Sphere</button>
          <button data-add="directional-light">+ Light</button>
          <button data-add="camera">+ Camera</button>
        </div>
        <div id="hierarchy-list" class="tree"></div>
      </aside>

      <section class="viewport-panel">
        <div id="viewport" class="viewport"></div>
        <div class="viewport-hint">Orbit: drag • Pan: right drag • Zoom: wheel</div>
      </section>

      <aside class="panel inspector">
        <div class="panel-heading">Inspector</div>
        <div id="inspector-content" class="inspector-content"></div>
      </aside>
    </main>

    <footer class="statusbar">
      <span id="status-text">Ready.</span>
      <span>Scene: <strong id="scene-name">B.O.O.M. Starter Scene</strong></span>
    </footer>

    <input id="file-input" type="file" accept=".json,application/json" hidden />
  </div>
`;

setupRenderer();
renderHierarchy();
renderInspector();
bindUI();
animate();

function setupRenderer() {
  const viewport = document.querySelector<HTMLDivElement>("#viewport")!;

  threeScene = new THREE.Scene();
  threeScene.background = new THREE.Color("#0a0e16");

  editorCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  editorCamera.position.set(8, 6, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  viewport.appendChild(renderer.domElement);
  viewport.appendChild(VRButton.createButton(renderer));
  const vrButton = renderer.domElement.parentElement?.querySelector(".webxr-button");
  if (vrButton) (vrButton as HTMLElement).style.display = "none";

  controls = new OrbitControls(editorCamera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.update();

  const ambient = new THREE.HemisphereLight("#dce8ff", "#1a2130", 1.4);
  threeScene.add(ambient);

  const grid = new THREE.GridHelper(30, 30, "#4a5568", "#26303f");
  grid.name = "Editor Grid";
  threeScene.add(grid);

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();
  rebuildThreeScene();
}

function resizeRenderer() {
  const viewport = document.querySelector<HTMLDivElement>("#viewport");
  if (!viewport || !renderer) return;
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  editorCamera.aspect = width / Math.max(height, 1);
  editorCamera.updateProjectionMatrix();
}

function rebuildThreeScene() {
  for (const [id, object] of objectMap) {
    threeScene.remove(object);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
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
}

function objectForNode(node: SceneNode): THREE.Object3D | null {
  if (node.type === "cube") {
    return new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: node.color, roughness: 0.55, metalness: 0.05 }),
    );
  }

  if (node.type === "sphere") {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 20),
      new THREE.MeshStandardMaterial({ color: node.color, roughness: 0.45, metalness: 0.05 }),
    );
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
    const helper = new THREE.CameraHelper(camera);
    return helper;
  }

  return null;
}

function applyTransform(object: THREE.Object3D, node: SceneNode) {
  object.position.set(node.transform.position.x, node.transform.position.y, node.transform.position.z);
  object.rotation.set(
    THREE.MathUtils.degToRad(node.transform.rotation.x),
    THREE.MathUtils.degToRad(node.transform.rotation.y),
    THREE.MathUtils.degToRad(node.transform.rotation.z),
  );
  object.scale.set(node.transform.scale.x, node.transform.scale.y, node.transform.scale.z);
}

function renderHierarchy() {
  const list = document.querySelector<HTMLDivElement>("#hierarchy-list")!;
  list.innerHTML = Object.values(sceneState.nodes)
    .map((node) => {
      const selected = node.id === selectedId ? "selected" : "";
      const icon = node.type === "scene" ? "◆" : node.type === "cube" ? "□" : node.type === "sphere" ? "○" : node.type === "camera" ? "◉" : "☀";
      return `<button class="tree-item ${selected}" data-select="${node.id}">
        <span class="tree-icon">${icon}</span>
        <span>${escapeHtml(node.name)}</span>
        <span class="tree-type">${node.type}</span>
      </button>`;
    })
    .join("");

  list.querySelectorAll<HTMLButtonElement>("[data-select]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedId = button.dataset.select!;
      renderHierarchy();
      renderInspector();
    });
  });
}

function renderInspector() {
  const container = document.querySelector<HTMLDivElement>("#inspector-content")!;
  const node = sceneState.nodes[selectedId];

  if (!node) {
    container.innerHTML = "<p>Nothing selected.</p>";
    return;
  }

  container.innerHTML = `
    <div class="inspector-title">${escapeHtml(node.name)}</div>
    <label>Name<input id="node-name" value="${escapeAttr(node.name)}" /></label>
    <label>Type<div class="readonly">${node.type}</div></label>
    <div class="section-label">Transform</div>
    ${vectorFields("Position", "position", node.transform.position)}
    ${vectorFields("Rotation", "rotation", node.transform.rotation)}
    ${vectorFields("Scale", "scale", node.transform.scale)}
    ${node.type === "cube" || node.type === "sphere" ? `
      <label>Color<input id="node-color" type="color" value="${node.color}" /></label>
    ` : ""}
    <label class="check-row"><input id="node-visible" type="checkbox" ${node.visible ? "checked" : ""}/> Visible</label>
    ${node.type !== "scene" ? '<button id="delete-node" class="danger">Delete Node</button>' : ""}
  `;

  bindInspector(node);
}

function vectorFields(label: string, key: "position" | "rotation" | "scale", value: { x: number; y: number; z: number }) {
  return `
    <div class="section-label">${label}</div>
    <div class="vector-row">
      ${(["x", "y", "z"] as const).map((axis) => `
        <label class="axis-label">${axis.toUpperCase()}
          <input data-transform="${key}" data-axis="${axis}" type="number" step="0.1" value="${value[axis]}" />
        </label>
      `).join("")}
    </div>
  `;
}

function bindInspector(node: SceneNode) {
  document.querySelector<HTMLInputElement>("#node-name")?.addEventListener("change", (event) => {
    node.name = (event.target as HTMLInputElement).value || node.name;
    renderHierarchy();
    syncThreeObject(node);
  });

  document.querySelectorAll<HTMLInputElement>("[data-transform]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      const key = target.dataset.transform as "position" | "rotation" | "scale";
      const axis = target.dataset.axis as "x" | "y" | "z";
      node.transform[key][axis] = Number(target.value);
      syncThreeObject(node);
    });
  });

  document.querySelector<HTMLInputElement>("#node-color")?.addEventListener("input", (event) => {
    node.color = (event.target as HTMLInputElement).value;
    syncThreeObject(node);
  });

  document.querySelector<HTMLInputElement>("#node-visible")?.addEventListener("change", (event) => {
    node.visible = (event.target as HTMLInputElement).checked;
    syncThreeObject(node);
  });

  document.querySelector<HTMLButtonElement>("#delete-node")?.addEventListener("click", () => {
    deleteNode(node.id);
  });
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
    const mesh = object as THREE.Mesh;
    (mesh.material as THREE.MeshStandardMaterial).color.set(node.color);
  }
}

function addNode(type: "cube" | "sphere" | "directional-light" | "camera") {
  const node = createNode(type);
  node.parentId = sceneState.rootId;
  sceneState.nodes[node.id] = node;
  sceneState.nodes[sceneState.rootId].children.push(node.id);
  selectedId = node.id;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus(`Added ${node.name}.`);
}

function deleteNode(id: string) {
  const node = sceneState.nodes[id];
  if (!node || node.id === sceneState.rootId) return;

  for (const childId of [...node.children]) deleteNode(childId);
  if (node.parentId) {
    sceneState.nodes[node.parentId].children = sceneState.nodes[node.parentId].children.filter((child) => child !== id);
  }
  delete sceneState.nodes[id];
  selectedId = sceneState.rootId;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus(`Deleted ${node.name}.`);
}

function resetScene() {
  const fresh = createDefaultScene();
  Object.assign(sceneState, fresh);
  selectedId = sceneState.rootId;
  document.querySelector("#scene-name")!.textContent = fresh.metadata.name;
  rebuildThreeScene();
  renderHierarchy();
  renderInspector();
  setStatus("Started a new scene.");
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
      setStatus(`Loaded ${loaded.metadata.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load scene.");
    }
  };
  reader.readAsText(file);
}

function bindUI() {
  document.querySelectorAll<HTMLButtonElement>("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addNode(button.dataset.add as "cube" | "sphere" | "directional-light" | "camera"));
  });

  document.querySelector("#new-scene")?.addEventListener("click", resetScene);
  document.querySelector("#save-scene")?.addEventListener("click", saveScene);
  document.querySelector("#load-scene")?.addEventListener("click", () => document.querySelector<HTMLInputElement>("#file-input")?.click());
  document.querySelector("#file-input")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) loadSceneFromFile(file);
  });

  document.querySelector("#play-scene")?.addEventListener("click", togglePlay);

  document.querySelector("#vr-scene")?.addEventListener("click", () => {
    const vrButton = document.querySelector<HTMLButtonElement>(".webxr-button");
    vrButton?.click();
  });

  const builderInput = document.querySelector<HTMLInputElement>("#builder-input")!;
  document.querySelector("#builder-run")?.addEventListener("click", () => runBuilder(builderInput.value));
  builderInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runBuilder(builderInput.value);
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveScene();
    }

    if (event.key === "Delete" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) {
      deleteNode(selectedId);
    }
  });

  renderer.domElement.addEventListener("pointerdown", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, editorCamera);
    const intersections = raycaster.intersectObjects([...objectMap.values()], true);
    const hit = intersections.find((intersection) => {
      let current: THREE.Object3D | null = intersection.object;
      while (current && current.userData.nodeId === undefined) current = current.parent;
      return current?.userData.nodeId;
    });

    const id = hit?.object.parent?.userData.nodeId ?? hit?.object.userData.nodeId;
    if (id && sceneState.nodes[id]) {
      selectedId = id;
      renderHierarchy();
      renderInspector();
    }
  });
}

function runBuilder(prompt: string) {
  const result = runBuildCommand(sceneState, prompt);
  const status = document.querySelector("#builder-status")!;
  status.textContent = result.message;

  if (result.createdNodeId) {
    selectedId = result.createdNodeId;
    rebuildThreeScene();
    renderHierarchy();
    renderInspector();
  }
}

function togglePlay() {
  playing = !playing;
  const button = document.querySelector<HTMLButtonElement>("#play-scene")!;
  button.textContent = playing ? "■ Stop" : "▶ Play";
  button.classList.toggle("danger", playing);
  setStatus(playing ? "Play mode enabled." : "Play mode stopped.");
}

function animate() {
  controls.update();

  if (playing) {
    for (const [id, object] of objectMap) {
      const node = sceneState.nodes[id];
      if (node?.type === "cube" || node?.type === "sphere") {
        object.rotation.y += 0.008;
      }
    }
  }

  renderer.setAnimationLoop(() => {
    controls.update();
    if (playing) {
      for (const object of objectMap.values()) {
        if (object instanceof THREE.Mesh) object.rotation.y += 0.004;
      }
    }
    renderer.render(threeScene, editorCamera);
  });
}

function setStatus(message: string) {
  document.querySelector("#status-text")!.textContent = message;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]!));
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}
