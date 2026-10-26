import mark from "@/assets/mba-compass-mark.png.asset.json";
import full from "@/assets/mba-compass-logo.png.asset.json";

export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <img src={mark.url} alt="MBA Compass" className="size-9 shrink-0 rounded-lg bg-card object-contain p-0.5" />
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className={`block truncate text-base font-bold tracking-tight ${inverted ? "text-ink-foreground" : "text-primary"}`}>
            MBA <span className="text-sky">Compass</span>
          </span>
          <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] ${inverted ? "text-ink-muted" : "text-muted-foreground"}`}>
            AI Interview Suite
          </span>
        </span>
      )}
    </span>
  );
}

export function FullLogo({ className = "" }: { className?: string }) {
  return <img src={full.url} alt="MBA Compass" className={className} />;
}
