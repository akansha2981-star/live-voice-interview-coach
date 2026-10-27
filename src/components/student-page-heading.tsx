import type { ReactNode } from "react";

export function StudentPageHeading({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="student-page-heading animate-reveal grid grid-cols-1 items-end gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
    <div className="min-w-0"><p className="student-eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>
    {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
  </header>;
}