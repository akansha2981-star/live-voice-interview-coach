import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` once visible, with an ease-out curve (rolls like a real counter). */
export function AnimatedNumber({ value, duration = 1400, suffix = "", prefix = "", delay = 0, signed = false }: { value: number; duration?: number; suffix?: string; prefix?: string; delay?: number; signed?: boolean }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(value); from.current = value; return; }
    let raf = 0; let timer = 0;
    const run = () => {
      const start = performance.now();
      const base = from.current;
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setN(Math.round(base + (value - base) * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else from.current = value;
      };
      raf = requestAnimationFrame(tick);
    };
    const node = el.current;
    if (!node || typeof IntersectionObserver === "undefined") { timer = window.setTimeout(run, delay); return () => { clearTimeout(timer); cancelAnimationFrame(raf); }; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); timer = window.setTimeout(run, delay); } }, { threshold: 0.3 });
    io.observe(node);
    return () => { io.disconnect(); clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [value, duration, delay]);
  return <span ref={el} className="tabular-nums">{prefix}{signed && n > 0 ? "+" : ""}{n}{suffix}</span>;
}

/** Circular score gauge that sweeps in on mount. */
export function ScoreRing({
  value,
  size = 120,
  stroke = 10,
  label,
  tone = "accent",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  tone?: "accent" | "sky" | "success" | "primary" | "destructive";
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-current opacity-15" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          className={`fill-none text-${tone} stroke-current transition-[stroke-dashoffset] duration-[1400ms] ease-out`}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <p className="font-display font-bold" style={{ fontSize: size * 0.28 }}>
          <AnimatedNumber value={value} />
        </p>
        {label && <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>}
      </div>
    </div>
  );
}

/** Horizontal bar that fills on mount. */
export function GrowBar({ value, tone = "bg-accent", className = "" }: { value: number; tone?: string; className?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, value))), 80);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-muted ${className}`}>
      <div className={`h-full rounded-full ${tone} transition-[width] duration-[1200ms] ease-out`} style={{ width: `${w}%` }} />
    </div>
  );
}
