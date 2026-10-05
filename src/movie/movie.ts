export interface Shot {
  id: string;
  title: string;
  duration: number;
  camera: string;
  notes: string;
  transition: "cut" | "fade" | "dissolve";
}

export interface MovieScene {
  id: string;
  title: string;
  shots: Shot[];
}

export interface MovieProject {
  version: 1;
  title: string;
  scenes: MovieScene[];
}

let counter = 0;
function id(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export function createMovieProject(title = "Untitled Movie"): MovieProject {
  const sceneId = id("movie-scene");
  return {
    version: 1,
    title,
    scenes: [{
      id: sceneId,
      title: "Opening Scene",
      shots: [{
        id: id("shot"),
        title: "Establishing Shot",
        duration: 5,
        camera: "Main Camera",
        notes: "Set the opening composition.",
        transition: "cut",
      }],
    }],
  };
}

export function addShot(project: MovieProject, sceneId: string, input: Partial<Pick<Shot, "title" | "duration" | "camera" | "notes" | "transition">> = {}): MovieProject {
  const scene = project.scenes.find((item) => item.id === sceneId);
  if (!scene) return project;
  const shot: Shot = {
    id: id("shot"),
    title: input.title ?? "New Shot",
    duration: Math.max(0.1, input.duration ?? 5),
    camera: input.camera ?? "Main Camera",
    notes: input.notes ?? "",
    transition: input.transition ?? "cut",
  };
  return {
    ...project,
    scenes: project.scenes.map((item) => item.id === sceneId ? { ...item, shots: [...item.shots, shot] } : item),
  };
}

export function splitShot(project: MovieProject, sceneId: string, shotId: string, firstDuration: number): MovieProject {
  const scene = project.scenes.find((item) => item.id === sceneId);
  const shot = scene?.shots.find((item) => item.id === shotId);
  if (!scene || !shot || firstDuration <= 0 || firstDuration >= shot.duration) return project;

  const first: Shot = { ...shot, id: id("shot"), title: `${shot.title} A`, duration: firstDuration };
  const second: Shot = { ...shot, id: id("shot"), title: `${shot.title} B`, duration: shot.duration - firstDuration };
  return {
    ...project,
    scenes: project.scenes.map((item) => item.id === sceneId
      ? { ...item, shots: item.shots.flatMap((candidate) => candidate.id === shotId ? [first, second] : [candidate]) }
      : item),
  };
}

export function totalDuration(project: MovieProject): number {
  return project.scenes.reduce((total, scene) => total + scene.shots.reduce((sum, shot) => sum + shot.duration, 0), 0);
}

export function serializeMovie(project: MovieProject): string {
  return JSON.stringify(project, null, 2);
}
