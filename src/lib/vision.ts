// Browser-only webcam presentation analysis. Observable signals only — never emotions or honesty.
export type VisionFrame = {
  t: number;
  faceVisible: boolean;
  yaw: number;
  pitch: number;
  gazeCentered: boolean;
  centered: boolean;
  tooFar: boolean;
  tooClose: boolean;
  shouldersLevel: boolean | null;
  brightness: number;
};

export type VisionSummary = {
  samples: number;
  face_visible_pct: number;
  facing_camera_pct: number;
  approx_eye_contact_pct: number;
  well_framed_pct: number;
  shoulders_level_pct: number | null;
  low_light_pct: number;
  avg_abs_yaw_deg: number;
  timeline: Array<{ t_s: number; face: number; eye: number; framed: number }>;
};

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export async function createVisionAnalyzer(video: HTMLVideoElement) {
  const vision = await import("@mediapipe/tasks-vision");
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
  const face = await vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
  });
  let pose: Awaited<ReturnType<typeof vision.PoseLandmarker.createFromOptions>> | null = null;
  try {
    pose = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch {
    pose = null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let frameCount = 0;

  function brightness() {
    if (!ctx) return 0.5;
    ctx.drawImage(video, 0, 0, 32, 24);
    const d = ctx.getImageData(0, 0, 32, 24).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return sum / (d.length / 4) / 255;
  }

  function analyze(now: number): VisionFrame | null {
    if (video.readyState < 2 || !video.videoWidth) return null;
    const res = face.detectForVideo(video, now);
    const lm = res.faceLandmarks?.[0];
    const frame: VisionFrame = {
      t: now,
      faceVisible: Boolean(lm),
      yaw: 0,
      pitch: 0,
      gazeCentered: false,
      centered: false,
      tooFar: false,
      tooClose: false,
      shouldersLevel: null,
      brightness: frameCount++ % 4 === 0 ? brightness() : -1,
    };
    if (lm) {
      const m = res.facialTransformationMatrixes?.[0]?.data;
      if (m) {
        frame.yaw = (Math.atan2(-m[8], Math.sqrt(m[9] ** 2 + m[10] ** 2)) * 180) / Math.PI;
        frame.pitch = (Math.atan2(m[9], m[10]) * 180) / Math.PI;
      }
      const xs = lm.map((p) => p.x);
      const ys = lm.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      frame.centered = Math.abs(cx - 0.5) < 0.18 && cy > 0.2 && cy < 0.65;
      frame.tooFar = w < 0.16;
      frame.tooClose = w > 0.55;
      // Iris position relative to eye corners (approximate gaze only).
      if (lm.length > 477) {
        const ratio = (iris: number, a: number, b: number) => (lm[iris].x - lm[a].x) / (lm[b].x - lm[a].x || 1e-6);
        const r = (ratio(468, 33, 133) + ratio(473, 362, 263)) / 2;
        frame.gazeCentered = r > 0.35 && r < 0.65 && Math.abs(frame.yaw) < 15 && Math.abs(frame.pitch) < 20;
      }
    }
    if (pose) {
      const p = pose.detectForVideo(video, now).landmarks?.[0];
      if (p && p[11] && p[12] && (p[11].visibility ?? 1) > 0.5 && (p[12].visibility ?? 1) > 0.5) {
        frame.shouldersLevel = Math.abs(p[11].y - p[12].y) < 0.05;
      }
    }
    return frame;
  }

  return {
    analyze,
    close() {
      face.close();
      pose?.close();
    },
  };
}

export function summarizeVision(frames: VisionFrame[], startedAt: number): VisionSummary {
  const n = frames.length || 1;
  const pct = (k: number) => Math.round((k / n) * 100);
  const withShoulders = frames.filter((f) => f.shouldersLevel !== null);
  const lit = frames.filter((f) => f.brightness >= 0);
  const timeline: VisionSummary["timeline"] = [];
  const bucket = 15000;
  for (let i = 0; i < frames.length; ) {
    const t0 = frames[i].t;
    const group = [];
    while (i < frames.length && frames[i].t - t0 < bucket) group.push(frames[i++]);
    const g = group.length;
    timeline.push({
      t_s: Math.round((t0 - startedAt) / 1000),
      face: Math.round((group.filter((f) => f.faceVisible).length / g) * 100),
      eye: Math.round((group.filter((f) => f.gazeCentered).length / g) * 100),
      framed: Math.round((group.filter((f) => f.centered && !f.tooFar && !f.tooClose).length / g) * 100),
    });
  }
  const faces = frames.filter((f) => f.faceVisible);
  return {
    samples: frames.length,
    face_visible_pct: pct(faces.length),
    facing_camera_pct: pct(faces.filter((f) => Math.abs(f.yaw) < 20 && Math.abs(f.pitch) < 20).length),
    approx_eye_contact_pct: pct(frames.filter((f) => f.gazeCentered).length),
    well_framed_pct: pct(frames.filter((f) => f.centered && !f.tooFar && !f.tooClose).length),
    shoulders_level_pct: withShoulders.length
      ? Math.round((withShoulders.filter((f) => f.shouldersLevel).length / withShoulders.length) * 100)
      : null,
    low_light_pct: lit.length ? Math.round((lit.filter((f) => f.brightness < 0.22).length / lit.length) * 100) : 0,
    avg_abs_yaw_deg: faces.length ? Math.round(faces.reduce((s, f) => s + Math.abs(f.yaw), 0) / faces.length) : 0,
    timeline: timeline.slice(0, 200),
  };
}

export function liveTip(f: VisionFrame | null): string | null {
  if (!f) return null;
  if (!f.faceVisible) return "We can't see your face — move into the frame.";
  if (f.tooFar) return "Move a little closer to the camera.";
  if (f.tooClose) return "Lean back slightly so your shoulders are visible.";
  if (!f.centered) return "Center yourself in the frame.";
  if (f.brightness >= 0 && f.brightness < 0.22) return "Your face looks dim — add light in front of you.";
  if (Math.abs(f.yaw) > 25) return "Turn back toward the camera.";
  if (f.shouldersLevel === false) return "Sit upright with level shoulders.";
  if (!f.gazeCentered) return "Look toward the camera lens when answering.";
  return null;
}
