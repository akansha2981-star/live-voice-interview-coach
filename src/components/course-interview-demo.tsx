import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const moments = [
  { label: "Clear answer", eye: 92, posture: 90, clarity: 89, pace: 132, fillers: 1, feedback: "Steady framing, a measured pace and a clear example.", transcript: "During my internship, I analysed customer feedback and shared three recommendations with the product team. An MBA will help me connect that analytical work to business decisions." },
  { label: "Looking away", eye: 61, posture: 87, clarity: 85, pace: 141, fillers: 2, feedback: "Look back towards the camera when finishing your key point.", transcript: "I learned to look beyond the numbers and, um, understand why customers make a decision. That experience helped me define my interest in strategy." },
  { label: "Leaning posture", eye: 83, posture: 58, clarity: 83, pace: 158, fillers: 3, feedback: "Reset to a comfortable upright position and leave space between ideas.", transcript: "I want to build, you know, a stronger understanding of finance and marketing so I can, um, work across teams and make better decisions." },
  { label: "Stronger closing", eye: 94, posture: 93, clarity: 92, pace: 128, fillers: 0, feedback: "A concise closing links your experience, skill gap and next step.", transcript: "My immediate goal is a strategy role. I bring analytical experience; I now want the management training to turn those insights into decisions." },
];

function DemoCandidate({ moment, playing }: { moment: number; playing: boolean }) {
  return <div className={`demo-candidate moment-${moment} ${playing ? "is-playing" : ""}`}>
    <svg viewBox="0 0 500 370" role="img" aria-label="Fictional animated MBA candidate in a scripted interview demonstration">
      <rect width="500" height="370" className="demo-wall" />
      <rect x="38" y="45" width="85" height="112" rx="4" className="demo-frame" /><path d="M55 130L80 98 100 120 108 85" className="demo-art" />
      <path d="M416 258V138M416 190Q375 175 392 142Q421 148 416 190M417 171Q450 142 445 118Q413 126 417 171" className="demo-plant" /><path d="M393 253H440L433 290H400Z" className="demo-pot" />
      <rect x="145" y="218" width="206" height="132" rx="32" className="demo-chair" />
      <g className="demo-person">
        <path d="M168 370V277Q171 237 215 229H285Q330 238 332 277V370Z" className="demo-jacket" />
        <path d="M216 229L250 256 285 229 273 370H227Z" className="demo-shirt" />
        <path d="M209 231L189 268 225 284 213 303 239 370M290 231L311 268 276 284 287 303 260 370" className="demo-seam" />
        <path d="M232 204H269V237Q251 257 232 237Z" className="demo-skin" />
        <g className="demo-head">
          <path d="M193 153Q183 81 228 73Q286 55 306 104L309 173 287 205H213Z" className="demo-hair" />
          <ellipse cx="250" cy="153" rx="52" ry="67" className="demo-skin" />
          <path d="M199 137Q202 70 255 82Q299 80 306 134Q276 120 263 102Q239 127 199 137Z" className="demo-hair" />
          <path d="M215 143Q226 137 236 143M264 143Q275 137 286 143" className="demo-features" />
          <g className="demo-eyes"><ellipse cx="226" cy="153" rx="4" ry="5" className="demo-hair" /><ellipse cx="275" cy="153" rx="4" ry="5" className="demo-hair" /></g>
          <path d="M250 151L246 173H253" className="demo-features" />
          <ellipse className="demo-mouth" cx="250" cy="190" rx="12" ry="3" />
        </g>
      </g>
      <rect x="180" y="73" width="138" height="155" rx="22" className="demo-face-box" />
      <circle cx="225" cy="153" r="14" className="demo-eye-ring" /><circle cx="275" cy="153" r="14" className="demo-eye-ring" />
      <path d="M250 246V330" className="demo-posture-guide" />
    </svg>
    <div className="demo-camera-caption"><span>Sample candidate</span><span>Simulated · no camera access</span></div>
  </div>;
}

export function CourseInterviewDemo() {
  const [moment, setMoment] = useState(0);
  const [playing, setPlaying] = useState(false);
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!reduced.matches);
    update(); reduced.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(element);
    return () => { reduced.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setMoment(value => (value + 1) % moments.length), 6500);
    return () => clearInterval(timer);
  }, [playing, visible]);
  const current = moments[moment] ?? moments[0];
  return <section id="demo" ref={section} className="course-section course-demo-band">
    <div className="course-container"><div className="section-index">INSIDE THE INTERVIEW ROOM</div><div className="course-section-heading"><p className="course-eyebrow">MEET YOUR NEXT PRACTICE SESSION</p><h2>Experience the future of MBA interviews.<br />See our AI in action.</h2><p>A scripted preview of the conversation, visible captions and preparation feedback. All scores below are illustrative, not live AI analysis.</p></div>
      <div className="course-demo-workspace">
        <div className="demo-toolbar"><div><span className="course-live-dot" /><b>Aria · MBA interview</b><span className="text-muted-foreground">Illustrative demo</span></div><Button size="sm" variant="outline" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? "Pause demo" : "Play demo"}</Button></div>
        <div className="demo-conversation"><DemoCandidate moment={moment} playing={playing} /><div className="demo-answer"><p className="course-eyebrow">ARIA’S QUESTION</p><h3>Why do you want to pursue an MBA at this point in your career?</h3><div className={`course-voice-wave ${playing ? "" : "demo-wave-paused"}`} aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <span key={i} />)}</div><p className="mt-5 text-xs font-bold text-muted-foreground">SAMPLE ANSWER · {current.label.toUpperCase()}</p><p className="demo-transcript" key={moment}>{current.transcript}</p><p className="demo-coaching" aria-live="off">{current.feedback}</p></div></div>
        <div className="demo-tracking">{[["Eye contact", current.eye, "%"], ["Posture", current.posture, "%"], ["Speech clarity", current.clarity, "%"], ["Speaking pace", current.pace, " WPM"], ["Filler words", current.fillers, ""]].map(([label, value, unit]) => <div key={String(label)}><p>{label}</p><strong>{value}<small>{unit}</small></strong>{Number(value) <= 100 && label !== "Filler words" && <progress value={Number(value)} max={100} aria-label={`Sample ${label}`} />}</div>)}</div>
        <div className="demo-scenes" aria-label="Demo moments">{moments.map((item, index) => <Button key={item.label} size="sm" variant={moment === index ? "secondary" : "ghost"} aria-pressed={moment === index} onClick={() => { setMoment(index); setPlaying(false); }}>{String(index + 1).padStart(2, "0")} · {item.label}</Button>)}</div>
      </div>
      <div className="mt-6 grid gap-4 text-sm text-muted-foreground md:grid-cols-3"><p><b className="text-foreground">Communication, not personality.</b> Pace, pauses and transcript evidence support delivery feedback, not a confidence or emotion diagnosis.</p><p><b className="text-foreground">Observable presentation.</b> Camera framing and posture are coaching signals; dressing sense and facial emotions are not scored.</p><p><b className="text-foreground">Clarity, not an accent grade.</b> Transcription certainty is a speech-clarity signal, not a pronunciation assessment.</p></div>
    </div>
  </section>;
}