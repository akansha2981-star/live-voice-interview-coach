import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` with an ease-out curve. */
export function AnimatedNumber({ value, duration = 1100, suffix = "" }: { value: number; duration?: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const base = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(base + (value - base) * eased);
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
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
