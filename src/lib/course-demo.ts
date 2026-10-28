export const demoQuestion = "Why do you want to pursue an MBA at this point in your career?";
export const demoScenes = [
  { label: "Clear answer", photo: 0, face: true, eye: 92, posture: 90, clarity: 89, pace: 132, fillers: 0, feedback: "Face in frame. A measured pace and a specific example.", transcript: "During my internship, I analysed customer feedback and shared three recommendations with the product team. An MBA will help me connect that analytical work to business decisions." },
  { label: "Looking away", photo: 1, face: true, eye: 61, posture: 87, clarity: 85, pace: 141, fillers: 1, feedback: "Gaze moved away. Bring your attention back towards the camera.", transcript: "I learned to look beyond the numbers and, um, understand why customers make a decision. That experience helped me define my interest in strategy." },
  { label: "Leaning posture", photo: 2, face: true, eye: 83, posture: 58, clarity: 83, pace: 158, fillers: 3, feedback: "Framing has shifted. Sit comfortably upright and leave space between ideas.", transcript: "I want to build, you know, a stronger understanding of finance and marketing so I can, um, work across teams and make better decisions." },
  { label: "Out of camera", photo: 3, face: false, eye: null, posture: null, clarity: null, pace: null, fillers: 3, feedback: "No face in frame. Return to the camera; visual tracking is unavailable while you are away.", transcript: "" },
  { label: "Back in frame", photo: 0, face: true, eye: 91, posture: 92, clarity: 90, pace: 130, fillers: 3, feedback: "Face detected again. Visual tracking resumes once you are back in frame.", transcript: "Thank you. I am back. My goal is to use those experiences to contribute more effectively to a business team." },
  { label: "Stronger closing", photo: 0, face: true, eye: 94, posture: 93, clarity: 92, pace: 128, fillers: 3, feedback: "A concise closing connects your experience, skill gap and next step.", transcript: "My immediate goal is a strategy role. I bring analytical experience; I now want the management training to turn those insights into decisions." },
] as const;

export const DEMO_SCENE_TICKS = 20;
export function demoSnapshot(sceneIndex: number, tick: number) {
  const index = Math.max(0, Math.min(demoScenes.length - 1, sceneIndex));
  const scene = demoScenes[index];
  const words = scene.transcript.split(/\s+/).filter(Boolean);
  const visibleWords = Math.min(words.length, Math.floor(Math.max(0, tick) / 16 * words.length));
  const priorWords = demoScenes.slice(0, index).reduce((sum, item) => sum + item.transcript.split(/\s+/).filter(Boolean).length, 0);
  return { scene, text: words.slice(0, visibleWords).join(" "), wordCount: priorWords + visibleWords, seconds: index * 10 + Math.min(10, Math.max(0, tick) / 2), visualStatus: scene.face ? "Tracking" : "Unavailable" };
}