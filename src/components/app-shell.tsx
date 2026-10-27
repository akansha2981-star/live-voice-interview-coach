import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

import { PREP_SECTIONS } from "@/lib/prep";

type NavItem = { to: "/dashboard" | "/slots" | "/my-slots" | "/resume-builder" | "/sop-review" | "/announcements" | "/prep/$section" | "/profile" | "/admin" | "/support"; params?: { section: string }; label: string; short: string; mark: string; tone: string };
const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Workspace", items: [
    { to: "/dashboard", label: "Overview", short: "Home", mark: "OV", tone: "bg-primary text-primary-foreground" },
    { to: "/announcements", label: "Important announcements", short: "News", mark: "IA", tone: "bg-destructive text-destructive-foreground" },
  ] },
  { title: "My interviews", items: [
    { to: "/slots", label: "Book interview", short: "Book", mark: "BK", tone: "bg-sky text-primary-foreground" },
    { to: "/my-slots", label: "My slots", short: "Slots", mark: "MS", tone: "bg-success text-primary-foreground" },
  ] },
  { title: "Career tools", items: [
    { to: "/resume-builder", label: "Resume Builder", short: "Resume", mark: "RB", tone: "bg-primary text-primary-foreground" },
    { to: "/sop-review", label: "AI SOP Review", short: "SOP", mark: "SR", tone: "bg-sky text-primary-foreground" },
  ] },
  { title: "My prep material", items: PREP_SECTIONS.map((p) => ({ to: "/prep/$section" as const, params: { section: p.slug }, label: p.label, short: "Prep", mark: p.mark, tone: "bg-ink text-ink-foreground" })) },
  { title: "Account", items: [
    { to: "/profile", label: "My profile", short: "Profile", mark: "PR", tone: "bg-accent text-accent-foreground" },
    { to: "/support", label: "Help & Support", short: "Help", mark: "HS", tone: "bg-secondary text-primary" },
  ] },
];
const MOBILE: NavItem[] = [GROUPS[0].items[0], GROUPS[1].items[1], { ...GROUPS[2].items[0], short: "Prep" }, GROUPS[0].items[1], GROUPS[3].items[0]];
const navKey = (n: NavItem) => n.to + (n.params?.section ?? "");

function NavLink({ n }: { n: NavItem }) {
  const base = "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-200";
  return <Link to={n.to} params={n.params as never} className={`${base} text-muted-foreground hover:translate-x-0.5 hover:bg-secondary hover:text-foreground`} activeProps={{ className: `${base} bg-secondary font-semibold text-primary shadow-[inset_3px_0_0_var(--primary)]` }}>
    <span className={`grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-bold tracking-wide ${n.tone}`}>{n.mark}</span>
    <span className="truncate">{n.label}</span>
  </Link>;
}

export function AppShell() {
  const { data: me } = useQuery(meQuery); const qc = useQueryClient(); const navigate = useNavigate();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }
  const name = me?.profile?.full_name || "Student";
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const groups = me?.isAdmin ? [...GROUPS, { title: "Administration", items: [{ to: "/admin", label: "Admin portal", short: "Admin", mark: "AD", tone: "bg-ink text-ink-foreground" } as NavItem] }] : GROUPS;
  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3"><Logo /><span className="hidden border-l pl-3 text-xs leading-tight text-muted-foreground lg:block"><span className="block font-semibold text-foreground">AI Interview</span>Performance workspace</span></Link>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link to="/slots" className="hidden items-center gap-2 rounded-full border bg-secondary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40 sm:flex"><span className="size-1.5 rounded-full bg-success motion-safe:animate-pulse" />{me?.credits ?? "—"} credits</Link>
          <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/slots">Book interview</Link></Button>
          <div className="mx-1 hidden h-8 w-px bg-border md:block" />
          <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-sky text-xs font-bold text-primary-foreground shadow-soft">{initials}</span><span className="hidden text-xs leading-tight sm:block"><span className="block text-muted-foreground">Welcome</span><span className="font-semibold">{name.split(" ")[0]}</span></span></div>
          <Button onClick={signOut} variant="ghost" size="sm">Logout</Button>
        </div>
      </div>
    </header>
    <div className="flex">
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-card/60 p-3 md:flex">
        {groups.map((g, gi) => <div key={g.title} style={{ "--i": gi } as React.CSSProperties} className="animate-reveal rounded-xl border bg-card p-2 shadow-[0_1px_2px_oklch(0.22_0.04_262/0.04)]">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.title}</p>
          <nav className="grid gap-0.5">{g.items.map((n) => <NavLink key={navKey(n)} n={n} />)}</nav>
        </div>)}
        <div className="animate-reveal relative mt-auto overflow-hidden rounded-xl bg-gradient-to-br from-primary to-ink p-4 text-primary-foreground" style={{ "--i": 4 } as React.CSSProperties}>
          <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-primary-foreground/10" />
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Interview credits</p>
          <p className="mt-1 text-3xl font-bold">{me?.credits ?? "—"}</p>
          <p className="text-xs opacity-80">₹100 per interview</p>
          <Button asChild size="sm" variant="secondary" className="mt-3 w-full"><Link to="/slots">Buy more credits</Link></Button>
        </div>
      </aside>
      <main className="mx-auto min-w-0 max-w-7xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-8"><div className="animate-fade"><Outlet /></div></main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-safe backdrop-blur-md md:hidden">{MOBILE.map((n) => <Link key={navKey(n)} to={n.to} params={n.params as never} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground" activeProps={{ className: "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-primary" }}>{({ isActive }) => <><span className={`grid size-7 place-items-center rounded-md text-[9px] font-bold ${isActive ? n.tone : "bg-secondary text-muted-foreground"}`}>{n.mark}</span>{n.short}</>}</Link>)}</nav>
  </div>;
}
