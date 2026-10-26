import type React from "react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/admin-utils";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="animate-reveal flex flex-wrap items-end justify-between gap-4 border-b pb-5">
    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin portal</p><h1 className="mt-1 text-2xl font-bold md:text-3xl">{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>;
}

export function Stat({ label, value, note, i = 0, tone = "text-primary" }: { label: string; value: ReactNode; note?: string; i?: number; tone?: string }) {
  return <div style={{ "--i": i } as React.CSSProperties} className="animate-reveal card-lift section-card relative overflow-hidden p-4">
    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-sky" />
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`mt-2 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
  </div>;
}

export function Card({ title, sub, children, actions, className = "" }: { title?: string; sub?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return <section className={`animate-reveal section-card p-5 ${className}`}>
    {(title || actions) && <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div>{title && <h2 className="text-lg font-bold">{title}</h2>}{sub && <p className="text-sm text-muted-foreground">{sub}</p>}</div>{actions}</div>}
    {children}
  </section>;
}

export type Col<T> = { key: string; label: string; render?: (row: T) => ReactNode; className?: string };
export function DataTable<T extends { id?: string }>({ rows, cols, empty = "No records found.", onRow, loading }: { rows: T[]; cols: Col<T>[]; empty?: string; onRow?: (r: T) => void; loading?: boolean }) {
  return <div className="overflow-x-auto rounded-lg border bg-card">
    <table className="w-full min-w-[720px] text-sm">
      <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr>{cols.map((c) => <th key={c.key} className={`px-3 py-2.5 font-semibold ${c.className ?? ""}`}>{c.label}</th>)}</tr></thead>
      <tbody className="divide-y">
        {loading ? <tr><td colSpan={cols.length} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
          : rows.length === 0 ? <tr><td colSpan={cols.length} className="p-6 text-center text-muted-foreground">{empty}</td></tr>
          : rows.map((r, i) => <tr key={r.id ?? i} onClick={onRow ? () => onRow(r) : undefined} className={`transition-colors hover:bg-secondary/40 ${onRow ? "cursor-pointer" : ""}`}>{cols.map((c) => <td key={c.key} className={`px-3 py-2.5 align-top ${c.className ?? ""}`}>{c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? "—")}</td>)}</tr>)}
      </tbody>
    </table>
  </div>;
}

export function Pager({ page, setPage, hasMore }: { page: number; setPage: (n: number) => void; hasMore: boolean }) {
  return <div className="mt-3 flex items-center justify-end gap-2 text-sm"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-muted-foreground">Page {page + 1}</span><Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>Next</Button></div>;
}

export function ExportButton({ name, rows }: { name: string; rows: () => Record<string, unknown>[] | Promise<Record<string, unknown>[]> }) {
  const [busy, setBusy] = useState(false);
  return <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { downloadCsv(name, await rows()); } finally { setBusy(false); } }}>{busy ? "Exporting…" : "Export CSV"}</Button>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-64 max-w-full" />;
}

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return <label className="grid gap-1 text-xs text-muted-foreground">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm text-foreground">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}

export function DateRange({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  return <div className="flex flex-wrap items-end gap-2">
    <label className="grid gap-1 text-xs text-muted-foreground">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" /></label>
    <label className="grid gap-1 text-xs text-muted-foreground">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" /></label>
  </div>;
}

export function StatusPill({ s }: { s: string }) {
  const tone = /complete|resolved|active|published|good/i.test(s) ? "bg-success/10 text-success" : /cancel|fail|no.?show|suspend|urgent|closed/i.test(s) ? "bg-destructive/10 text-destructive" : /progress|processing|generating|analy|waiting|high/i.test(s) ? "bg-accent/30 text-foreground" : "bg-secondary text-primary";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone}`}>{s.replace(/_/g, " ")}</span>;
}

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function useRange(days = 30) {
  const [from, setFrom] = useState(isoDay(new Date(Date.now() - days * 86400000)));
  const [to, setTo] = useState(isoDay(new Date()));
  return { from, to, setFrom, setTo, fromIso: new Date(`${from}T00:00:00`).toISOString(), toIso: new Date(`${to}T23:59:59`).toISOString() };
}
