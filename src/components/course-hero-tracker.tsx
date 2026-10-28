import { useEffect, useState } from "react";

export const TRACKED_ITEMS = [
  "Posture",
  "Communication",
  "Topic-wise understanding",
  "Dressing",
  "Eye contact",
  "Speech clarity",
  "Speaking pace",
  "Word count",
  "Filler words",
];

const LONGEST = TRACKED_ITEMS.reduce((a, b) => (b.length > a.length ? b : a), "");

export function CourseHeroTracker() {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex(i => (i + 1) % TRACKED_ITEMS.length), 1800);
    return () => window.clearInterval(id);
  }, [reduced]);

  const word = TRACKED_ITEMS[index];

  return (
    <p className="course-hero-tracker">
      <span className="course-hero-tracker-label">Track your</span>
      {reduced ? (
        <span className="course-hero-tracker-static">{TRACKED_ITEMS.join(" · ")}</span>
      ) : (
        <span className="course-hero-tracker-words" aria-hidden="true">
          <span className="course-hero-tracker-size">{LONGEST}</span>
          <span key={word} className="course-hero-tracker-word">{word}</span>
        </span>
      )}
      <span className="course-hero-tracker-more">+ more, every answer</span>
      <span className="sr-only">Every interview tracks your posture, communication, topic-wise understanding, dressing, eye contact, speech clarity, speaking pace, word count and filler words.</span>
    </p>
  );
}
