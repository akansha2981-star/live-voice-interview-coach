import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import candidateScenes from "@/assets/interview-demo-scenes.jpg";
import { DEMO_SCENE_TICKS, demoQuestion, demoScenes, demoSnapshot } from "@/lib/course-demo";

export function CourseInterviewDemo() {
  const [position, setPosition] = useState({ scene: 0, tick: 0 });
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlaying(!reduced.matches);
    update();
    reduced.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.08 });
    observer.observe(element);
    return () => { reduced.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = setInterval(() => setPosition(value => value.tick >= DEMO_SCENE_TICKS
      ? { scene: (value.scene + 1) % demoScenes.length, tick: 0 }
      : { ...value, tick: value.tick + 1 }), 500);
    return () => clearInterval(timer);
  }, [playing, visible]);
  const snapshot = demoSnapshot(position.scene, position.tick);
  const current = snapshot.scene;
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [snapshot.text, position.scene]);
  const chooseScene = (scene: number) => { setPosition({ scene, tick: 16 }); setPlaying(false); };
  const time = `${String(Math.floor(snapshot.seconds / 60)).padStart(2, "0")}:${String(Math.floor(snapshot.seconds % 60)).padStart(2, "0")}`;
  const metrics = [
    { label: "Eye contact", value: current.eye, unit: "%" },
    { label: "Posture", value: current.posture, unit: "%" },
    { label: "Speech clarity", value: current.clarity, unit: "%" },
    { label: "Speaking pace", value: current.pace, unit: " WPM" },
    { label: "Word count", value: snapshot.wordCount, unit: " words" },
    { label: "Filler words", value: current.fillers, unit: " total" },
  ];
  return <section id="demo" ref={section} className="course-section course-demo-band">
    <div className="course-container">
      <div className="section-index">INSIDE THE INTERVIEW ROOM</div>
      <div className="course-section-heading"><p className="course-eyebrow">MEET YOUR NEXT PRACTICE SESSION</p><h2>Experience the future of MBA interviews.<br />See our AI in action.</h2><p>A closer look at the conversation, transcript and presentation feedback. Scripted demonstration · generated candidate images · illustrative metrics.</p></div>
      <div className={`course-demo-workspace demo-enhanced ${playing ? "demo-running" : "demo-paused"}`}>
        <div className="demo-toolbar"><div><span className="course-live-dot" /><b>Aria · MBA interview</b><span className="demo-session-label">SCRIPTED PREVIEW</span></div><div className="demo-playback"><span className="demo-clock">{time}</span><Button size="sm" variant="outline" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? "Pause demo" : "Play demo"}</Button><Button size="sm" variant="ghost" onClick={() => { setPosition({ scene: 0, tick: 0 }); }}>Restart</Button></div></div>
        <div className="demo-scene-progress"><progress value={position.scene * DEMO_SCENE_TICKS + position.tick} max={demoScenes.length * DEMO_SCENE_TICKS} aria-label="Scripted demo progress" /></div>
        <div className="demo-conversation">
          <div className={`demo-camera-real photo-scene-${current.photo} ${current.face ? "" : "demo-face-missing"}`}>
            <img src={candidateScenes} width={1536} height={1024} loading="lazy" alt={current.face ? `Generated sample candidate: ${current.label.toLowerCase()}` : "Generated empty interview chair: candidate is out of camera"} />
            <div className="demo-camera-top"><span>Sample candidate</span><span>{current.face ? "Face in frame" : "No face detected"}</span></div>
            {current.face && <div className={`demo-face-outline ${position.scene === 1 || position.scene === 2 ? "demo-outline-warning" : ""}`} aria-hidden="true"><i /><i /><i /><i /></div>}
            {!current.face && <div className="demo-away-notice"><span className="demo-alert-dot" /><strong>You’re out of camera</strong><p>Return to the frame to resume visual tracking.</p><small>Audio and camera signals are tracked separately.</small></div>}
            <div className="demo-camera-bottom"><span>{current.face ? "Camera framing · available" : "Visual metrics · unavailable"}</span><span>Sample scene {position.scene + 1} / {demoScenes.length}</span></div>
          </div>
          <div className="demo-answer"><div className="demo-aria-heading"><div className="demo-aria-avatar">A</div><div><b>Aria</b><p>Your AI interviewer</p></div><span className="demo-listening">{current.face ? "Listening" : "Awaiting return"}</span></div><p className="course-eyebrow mt-5">QUESTION 01 · CAREER GOALS</p><h3>{demoQuestion}</h3><div className={`course-voice-wave ${playing && current.face ? "" : "demo-wave-paused"}`} aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <span key={i} />)}</div><div className={`demo-coaching ${!current.face ? "demo-coaching-alert" : ""}`} role="status"><span>{current.face ? "PRESENTATION FEEDBACK" : "CAMERA ALERT"}</span><p>{current.feedback}</p></div><div className="demo-signal-status"><span>Camera <b>{current.face ? "In frame" : "Out of frame"}</b></span><span>Microphone <b>{current.face ? "Speech sample" : "No speech sample"}</b></span><span>Transcript <b>{playing && current.face ? "Updating" : "Paused"}</b></span></div></div>
        </div>
        <div className="demo-tracking-heading"><b>6 feedback indicators</b><span>Illustrative values · not a live assessment</span></div>
        <div className="demo-tracking">{metrics.map(metric => <div key={metric.label}><p>{metric.label}</p><strong>{metric.value ?? "—"}<small>{metric.value === null ? " unavailable" : metric.unit}</small></strong>{metric.unit === "%" && <progress value={metric.value ?? 0} max={100} aria-label={`Sample ${metric.label}`} />}</div>)}</div>
        <div className="demo-transcript-workspace"><div className="demo-transcript-title"><div><span className="course-live-dot" /><b>Conversation transcript</b></div><span>{snapshot.wordCount} candidate words · scripted</span></div><div ref={transcript} className="demo-transcript-log" tabIndex={0} aria-label="Sample conversation transcript"><div className="demo-transcript-turn"><span>00:00 · ARIA</span><p>{demoQuestion}</p></div>{demoScenes.slice(0, position.scene + 1).map((scene, index) => <div className={`demo-transcript-turn ${scene.face ? "candidate-turn" : "system-turn"}`} key={scene.label}><span>00:{String(index * 10).padStart(2, "0")} · {scene.face ? "CANDIDATE" : "CAMERA NOTICE"}</span><p>{!scene.face ? "Face left the frame. Visual measurements unavailable until the candidate returns." : index === position.scene ? snapshot.text || "…" : scene.transcript}{index === position.scene && playing && scene.face && position.tick < 16 && <i className="demo-caption-cursor" aria-hidden="true" />}</p></div>)}</div></div>
        <div className="demo-scenes" aria-label="Demo moments">{demoScenes.map((item, index) => <Button key={item.label} size="sm" variant={position.scene === index ? "secondary" : "ghost"} aria-pressed={position.scene === index} onClick={() => chooseScene(index)}>{String(index + 1).padStart(2, "0")} · {item.label}</Button>)}</div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">This preview does not access your camera, microphone or paid AI. Camera feedback reflects visible framing and presentation only, never personality or emotions.</p>
    </div>
  </section>;
}
