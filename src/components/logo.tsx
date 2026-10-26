export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-accent font-display text-lg font-bold text-accent-foreground">
        M
      </span>
      <span className={`font-display text-lg font-semibold ${inverted ? "text-ink-foreground" : "text-foreground"}`}>
        MBA Compass <span className="text-accent">Interview</span>
      </span>
    </span>
  );
}
