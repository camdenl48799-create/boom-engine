import { createMovieProject, addShot, serializeMovie, totalDuration, type MovieProject } from "./movie/movie";
import { getDefaultAddons, toggleAddon, type BoomAddon } from "./addons/addons";

type Mode = "hub" | "chat" | "game" | "movie";

export function mountStudioShell(app: HTMLElement, setStatus?: (message: string) => void) {
  let mode: Mode = "hub";
  let movie = createMovieProject();
  let addons = getDefaultAddons();

  const overlay = document.createElement("div");
  overlay.id = "boom-studio-shell";
  overlay.innerHTML = `
    <div class="boom-hub-backdrop"></div>
    <section class="boom-hub" aria-label="B.O.O.M. Hub">
      <header class="boom-hub-header">
        <div><div class="hub-kicker">B.O.O.M. ENGINE 1.0</div><h1>Choose your studio</h1><p>Build worlds, make games, direct movies, and extend the engine.</p></div>
        <button class="hub-close" aria-label="Close Hub">×</button>
      </header>
      <div class="hub-mode-grid">
        <button class="hub-mode" data-mode="chat"><span>✦</span><b>Chat Studio</b><small>Project-aware AI assistant</small></button>
        <button class="hub-mode" data-mode="game"><span>◇</span><b>Game Studio</b><small>3D worlds, play mode and VR</small></button>
        <button class="hub-mode featured" data-mode="movie"><span>🎬</span><b>Movie Mode</b><small>Storyboard, shots and cinematic timeline</small></button>
      </div>
      <div class="hub-lower">
        <div><b>Recent Project</b><span>B.O.O.M. Starter Scene</span></div>
        <button id="hub-addons">🧩 Add-ons</button>
      </div>
    </section>
    <section class="boom-movie" aria-label="Movie Mode">
      <header class="movie-header">
        <button class="movie-back">← Hub</button>
        <div><div class="hub-kicker">B.O.O.M. ENGINE</div><h2>🎬 Movie Mode</h2></div>
        <div class="movie-actions"><button id="movie-director">✦ AI Director</button><button id="movie-add-shot">＋ Shot</button><button id="movie-save">Save Movie</button></div>
      </header>
      <div class="movie-body">
        <aside class="movie-storyboard"><div class="studio-heading">STORYBOARD</div><div id="movie-scenes"></div></aside>
        <main class="movie-center"><div class="movie-viewport"><div class="camera-frame"><span>CAMERA 01</span><strong id="movie-shot-title">Establishing Shot</strong></div></div><div class="movie-timeline"><div class="timeline-head"><span>TIMELINE</span><b id="movie-duration">0:05</b></div><div id="movie-tracks"></div></div></main>
        <aside class="movie-director-panel"><div class="studio-heading">DIRECTOR</div><div class="director-card"><span>✦</span><b>AI Director</b><p>Describe the movie moment you want to create. B.O.O.M. turns it into editable scenes and shots.</p><textarea id="director-prompt" placeholder="e.g. Create a dramatic sci-fi opening..."></textarea><button id="director-generate">Create Sequence</button></div><div class="studio-heading">ADD-ONS</div><div id="movie-addon-list"></div></aside>
      </div>
    </section>
    <section class="boom-addons" aria-label="Add-on Manager">
      <header class="addons-header"><button class="addons-back">← Hub</button><div><div class="hub-kicker">B.O.O.M. ENGINE</div><h2>🧩 Add-on Manager</h2></div></header>
      <div class="addons-grid" id="addons-grid"></div>
    </section>
  `;
  app.appendChild(overlay);

  const hub = overlay.querySelector<HTMLElement>(".boom-hub")!;
  const movieView = overlay.querySelector<HTMLElement>(".boom-movie")!;
  const addonsView = overlay.querySelector<HTMLElement>(".boom-addons")!;

  function show(next: Mode) {
    mode = next;
    hub.hidden = next !== "hub";
    movieView.hidden = next !== "movie";
    addonsView.hidden = next !== "hub" && next !== "chat" && next !== "game";
    if (next === "addons" as Mode) addonsView.hidden = false;
    if (next === "movie") renderMovie();
    if (next === "hub") {
      addonsView.hidden = true;
      setStatus?.("B.O.O.M. Hub ready.");
    }
  }

  function renderMovie() {
    const scene = movie.scenes[0];
    const scenes = overlay.querySelector("#movie-scenes")!;
    scenes.innerHTML = scene.shots.map((shot, index) =>
      `<button class="story-card ${index === 0 ? "active" : ""}" data-shot="${shot.id}"><span>SHOT ${String(index + 1).padStart(2, "0")}</span><b>${escapeHtml(shot.title)}</b><small>${shot.duration.toFixed(1)}s · ${escapeHtml(shot.camera)}</small></button>`).join("");
    const tracks = overlay.querySelector("#movie-tracks")!;
    tracks.innerHTML = scene.shots.map((shot) =>
      `<button class="timeline-shot" data-shot="${shot.id}" style="--shot-width:${Math.max(90, shot.duration * 28)}px"><b>${escapeHtml(shot.title)}</b><small>${shot.duration.toFixed(1)}s</small></button>`).join("");
    overlay.querySelector("#movie-duration")!.textContent = formatTime(totalDuration(movie));
    overlay.querySelector("#movie-addon-list")!.innerHTML = addons.filter(a => a.category === "Movie" || a.category === "AI").slice(0, 5).map(addon =>
      `<button class="mini-addon ${addon.enabled ? "enabled" : ""}" data-addon="${addon.id}"><span>${addon.enabled ? "✓" : "○"}</span>${escapeHtml(addon.name)}</button>`).join("");
    bindMovieButtons();
  }

  function bindMovieButtons() {
    overlay.querySelectorAll<HTMLElement>("[data-shot]").forEach((el) => el.addEventListener("click", () => {
      const shot = movie.scenes[0].shots.find(s => s.id === el.dataset.shot);
      if (!shot) return;
      overlay.querySelector("#movie-shot-title")!.textContent = shot.title;
      setStatus?.("Selected " + shot.title + ".");
    }));
    overlay.querySelectorAll<HTMLButtonElement>("[data-addon]").forEach((button) => button.addEventListener("click", () => {
      const id = button.dataset.addon!;
      addons = toggleAddon(addons, id, !addons.find(a => a.id === id)?.enabled);
      renderMovie();
      setStatus?.("Movie add-on updated.");
    }));
  }

  function renderAddons() {
    const grid = overlay.querySelector("#addons-grid")!;
    grid.innerHTML = addons.map((addon) => `
      <article class="addon-card ${addon.enabled ? "enabled" : ""}">
        <div class="addon-top"><span class="addon-icon">🧩</span><span class="addon-version">v${addon.version}</span></div>
        <h3>${escapeHtml(addon.name)}</h3><span class="addon-category">${addon.category}</span>
        <p>${escapeHtml(addon.description)}</p>
        <div class="addon-permissions">${addon.permissions.map(p => `<code>${escapeHtml(p)}</code>`).join("")}</div>
        <button data-addon-manager="${addon.id}">${addon.enabled ? "Disable" : "Enable"} Add-on</button>
      </article>`).join("");
    overlay.querySelectorAll<HTMLButtonElement>("[data-addon-manager]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.addonManager!;
      addons = toggleAddon(addons, id, !addons.find(a => a.id === id)?.enabled);
      renderAddons();
      setStatus?.("Add-on " + (addons.find(a => a.id === id)?.enabled ? "enabled." : "disabled."));
    }));
  }

  overlay.querySelectorAll<HTMLElement>("[data-mode]").forEach(button => button.addEventListener("click", () => show(button.dataset.mode as Mode)));
  overlay.querySelector(".hub-close")?.addEventListener("click", () => show("game"));
  overlay.querySelector(".movie-back")?.addEventListener("click", () => show("hub"));
  overlay.querySelector(".addons-back")?.addEventListener("click", () => show("hub"));
  overlay.querySelector("#hub-addons")?.addEventListener("click", () => { renderAddons(); addonsView.hidden = false; hub.hidden = true; mode = "hub"; });
  overlay.querySelector("#movie-add-shot")?.addEventListener("click", () => {
    movie = addShot(movie, movie.scenes[0].id, { title: "New Cinematic Shot", duration: 4, camera: "Main Camera" });
    renderMovie();
    setStatus?.("Added a new cinematic shot.");
  });
  overlay.querySelector("#movie-save")?.addEventListener("click", () => download("movie.boommovie", serializeMovie(movie), "application/json"));
  overlay.querySelector("#movie-director")?.addEventListener("click", () => {
    (overlay.querySelector("#director-prompt") as HTMLTextAreaElement).focus();
  });
  overlay.querySelector("#director-generate")?.addEventListener("click", () => {
    const prompt = (overlay.querySelector("#director-prompt") as HTMLTextAreaElement).value.trim();
    if (!prompt) return;
    movie = addShot(movie, movie.scenes[0].id, { title: "AI Director Shot", duration: 6, notes: prompt });
    renderMovie();
    setStatus?.("AI Director created an editable shot from your idea.");
  });

  renderAddons();
  show("hub");
  return {
    openHub: () => show("hub"),
    openMovie: () => show("movie"),
    openAddons: () => { renderAddons(); hub.hidden = true; addonsView.hidden = false; },
  };
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(0).padStart(2, "0")}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
