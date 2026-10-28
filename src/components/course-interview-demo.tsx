import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import videoAsset from "@/assets/interview-demo-speaking.mp4.asset.json";
import webVideoAsset from "@/assets/interview-demo-speaking.webm.asset.json";
import posterAsset from "@/assets/interview-demo-start.jpg.asset.json";
import { VIDEO_DEMO_DURATION, videoDemoCaptions, videoDemoMoments, videoDemoQuestion, videoDemoSnapshot } from "@/lib/course-video-demo";

export function CourseInterviewDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const section = useRef<HTMLElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState("");
  const snapshot = videoDemoSnapshot(seconds);
  const time = (value: number) => `00:${String(Math.floor(value)).padStart(2, "0")}`;

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    // Never start speech without user action, and pause when leaving the section.
    const observer = new IntersectionObserver(([entry]) => {
      const media = video.current;
      if (!media) return;
      if (!entry.isIntersecting) media.pause();
    }, { rootMargin: "150px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [snapshot.wordCount]);

  const play = async () => {
    const media = video.current;
    if (!media) return;
    setError("");
    if (!media.paused) { media.pause(); return; }
    if (media.ended) media.currentTime = 0;
    try { await media.play(); } catch { setError("Playback could not start. Please press Play again."); }
  };
  const seek = (value: number) => {
    const media = video.current;
    if (!media) return;
    media.currentTime = value;
    setSeconds(value);
  };
  const metrics = [
    { label: "Eye contact", value: snapshot.eye, unit: "%" },
    { label: "Posture", value: snapshot.posture, unit: "%" },
    { label: "Blink rate", value: snapshot.blinks, unit: "/ min" },
    { label: "Speech clarity", value: snapshot.clarity, unit: "%" },
    { label: "Speaking pace", value: snapshot.pace, unit: "WPM" },
    { label: "Word count", value: snapshot.wordCount, unit: "captioned words" },
    { label: "Filler words", value: snapshot.fillers, unit: "in this answer" },
  ];
  return <section id="demo" ref={section} className="course-section course-demo-band">
    <div className="course-container">
      <div className="section-index">INSIDE THE INTERVIEW ROOM</div>
      <div className="course-section-heading"><p className="course-eyebrow">MEET YOUR NEXT PRACTICE SESSION</p><h2>Experience the future of MBA interviews.<br />See our AI in action.</h2><p>A 30-second AI-generated interview conversation · spoken answers · illustrative tracking.</p></div>
      <div className={`course-demo-workspace demo-enhanced demo-video ${playing ? "demo-running" : "demo-paused"}`}>
        <div className="demo-toolbar"><div><span className="course-live-dot" /><b>Aria · MBA interview</b><span className="demo-session-label">AI-GENERATED VIDEO PREVIEW</span></div><div className="demo-playback"><span className="demo-clock">{time(seconds)} / 00:30</span><Button size="sm" variant="outline" onClick={play} aria-pressed={playing}>{playing ? "Pause video" : "Play video"}</Button><Button size="sm" variant="ghost" onClick={() => { const media = video.current; if (!media) return; media.muted = !muted; setMuted(!muted); }} aria-pressed={!muted}>{muted ? "Sound on" : "Mute"}</Button><Button size="sm" variant="ghost" onClick={() => seek(0)}>Restart</Button></div></div>
        <div className="demo-video-seek"><input aria-label="Interview video position" type="range" min={0} max={VIDEO_DEMO_DURATION} step={0.1} value={seconds} onChange={event => seek(Number(event.target.value))} /></div>
        {error && <p className="demo-video-error" role="alert">{error}</p>}
        <div className="demo-conversation">
          <div className={`demo-camera-real ${snapshot.face ? "" : "demo-face-missing"}`}>
            <video ref={video} poster={posterAsset.url} playsInline muted={muted} preload="metadata" aria-label="AI-generated candidate answering an MBA interview" onTimeUpdate={event => setSeconds(event.currentTarget.currentTime)} onSeeked={event => setSeconds(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError("The interview video couldn’t load. Please reload the page.")}>
              <source src={videoAsset.url} type="video/mp4" />
              <source src={webVideoAsset.url} type="video/webm" />
              <track kind="captions" src={videoDemoCaptions} srcLang="en" label="English" />
            </video>
            <div className="demo-camera-top"><span>AI-generated candidate</span><span>{snapshot.face ? "Face in frame" : "Face out of frame"}</span></div>
            {!snapshot.face && <div className="demo-video-camera-notice" role="status">Camera notice · visual tracking unavailable</div>}
            <div className="demo-camera-bottom"><span>{snapshot.face ? "Camera · in frame" : "Camera · out of frame"}</span><span>{playing ? snapshot.speaking ? "Candidate speaking" : seconds < 3 ? "Aria speaking" : "Natural pause" : "Video paused"}</span></div>
          </div>
          <div className="demo-answer"><div className="demo-aria-heading"><div className="demo-aria-avatar">A</div><div><b>Aria</b><p>Your AI interviewer</p></div><span className="demo-listening">{seconds < 3 ? "Asking" : "Listening"}</span></div><p className="course-eyebrow mt-5">QUESTION 01 · CAREER GOALS</p><h3>{videoDemoQuestion}</h3><div className={`demo-coaching ${snapshot.face ? "" : "demo-coaching-alert"}`} role="status"><span>{snapshot.face ? "SAMPLE PRESENTATION FEEDBACK" : "CAMERA ALERT"}</span><p>{snapshot.feedback}</p></div><div className="demo-signal-status"><span>Camera <b>{snapshot.face ? "In frame" : "Unavailable"}</b></span><span>Audio <b>{muted ? "Muted" : "Sound on"}</b></span><span>Transcript <b>{playing ? "Following video" : "Paused"}</b></span></div></div>
        </div>
        <div className="demo-tracking-heading"><b>7 feedback indicators</b><span>Sample values · word count follows verified captions</span></div>
        <div className="demo-tracking">{metrics.map(metric => <div key={metric.label}><p>{metric.label}</p><strong>{metric.value ?? "—"}<small>{metric.value === null ? "unavailable" : metric.unit}</small></strong>{metric.unit === "%" && <progress value={metric.value ?? 0} max={100} aria-label={`Sample ${metric.label}`} />}</div>)}</div>
        <div className="demo-transcript-workspace"><div className="demo-transcript-title"><div><span className="course-live-dot" /><b>Conversation transcript</b></div><span>{snapshot.wordCount} candidate words · video captions</span></div><div ref={transcript} className="demo-transcript-log" tabIndex={0} aria-label="Sample conversation transcript">{snapshot.turns.length === 0 && <p className="text-sm text-muted-foreground">00:00 · Interview begins</p>}{snapshot.turns.map(turn => <div className={`demo-transcript-turn ${turn.speaker === "Candidate" ? "candidate-turn" : ""}`} key={turn.start}><span>{time(turn.start)} · {turn.speaker.toUpperCase()}</span><p>{turn.text || "…"}</p></div>)}{!snapshot.face && <div className="demo-transcript-turn system-turn"><span>00:18 · CAMERA NOTICE</span><p>Face outside the frame. Visual feedback is unavailable.</p></div>}</div></div>
        <div className="demo-scenes" aria-label="Video moments">{videoDemoMoments.map((moment, index) => <Button key={moment.label} size="sm" variant={snapshot.moment === index ? "secondary" : "ghost"} aria-pressed={snapshot.moment === index} onClick={() => seek(moment.start)}>{String(index + 1).padStart(2, "0")} · {moment.label}</Button>)}</div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">AI-generated recorded demonstration, not a live session. Tracking values are illustrative, not measurements of this video. No camera or microphone access; playback does not use paid AI.</p>
    </div>
  </section>;
}