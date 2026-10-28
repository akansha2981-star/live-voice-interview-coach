import captions from "./course-video-captions.json";

export const VIDEO_DEMO_DURATION = 30.08;
export const videoDemoQuestion = "Why do you want to pursue an MBA?";
export const videoDemoMoments = [
  { label: "The question", start: 0 },
  { label: "Her answer", start: 4.4 },
  { label: "Posture change", start: 14.2 },
  { label: "Out of frame", start: 19.2 },
  { label: "Back in frame", start: 22.3 },
  { label: "Career goal", start: 24.9 },
] as const;

export function videoDemoSnapshot(time: number) {
  const seconds = Math.max(0, Math.min(VIDEO_DEMO_DURATION, time));
  const visible = captions.filter(word => word.end <= seconds);
  const candidate = visible.filter(word => word.speaker === "Candidate");
  const face = seconds < 18.35 || seconds >= 21.55;
  const speaking = captions.some(word => word.speaker === "Candidate" && seconds >= word.start && seconds <= word.end + 0.12);
  const moment = videoDemoMoments.reduce((index, item, i) => seconds >= item.start ? i : index, 0);
  const turns = [
    { speaker: "Aria", start: 0.78, end: 2.7 },
    { speaker: "Candidate", start: 4.42, end: 13.66 },
    { speaker: "Candidate", start: 14.24, end: 17.64 },
    { speaker: "Candidate", start: 22.38, end: 24.18 },
    { speaker: "Candidate", start: 24.92, end: 29.6 },
  ].filter(turn => turn.start <= seconds).map(turn => ({
    ...turn,
    text: visible.filter(word => word.speaker === turn.speaker && word.start >= turn.start && word.end <= turn.end).map(word => word.text).join(" "),
  }));
  return {
    seconds, face, speaking, moment, turns,
    wordCount: candidate.length,
    eye: face ? 91 : null,
    posture: face ? seconds >= 14.2 && seconds < 18.35 ? 72 : 92 : null,
    blinks: face ? seconds < 14.2 ? 12 : 15 : null,
    clarity: candidate.length > 0 ? 90 : null,
    pace: candidate.length > 0 ? 145 : null,
    fillers: 0,
    feedback: !face ? "Face outside the frame. Visual indicators are unavailable until she returns."
      : seconds >= 21.55 && seconds < 24.9 ? "Back in frame. Camera framing and posture indicators resume."
      : seconds >= 14.2 && seconds < 18.35 ? "She leans forward and adjusts her posture while continuing her answer."
      : seconds < 4.42 ? "The candidate listens to Aria’s question before answering."
      : "She answers aloud with natural blinking, small gestures and pauses.",
  };
}

function vttTime(seconds: number) {
  return `00:${String(Math.floor(seconds / 60)).padStart(2, "0")}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;
}
export const videoDemoCaptions = `data:text/vtt;charset=utf-8,${encodeURIComponent("WEBVTT\n\n" + captions.map((word, index) => `${index + 1}\n${vttTime(word.start)} --> ${vttTime(Math.max(word.start + 0.1, word.end))}\n${word.speaker}: ${word.text}\n`).join("\n"))}`;