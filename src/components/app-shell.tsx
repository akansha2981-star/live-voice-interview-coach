import { useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

import { PREP_SECTIONS } from "@/lib/prep";

type NavItem = { to: "/dashboard" | "/slots" | "/my-slots" | "/resume-builder" | "/sop-review" | "/announcements" | "/prep/$section" | "/gk" | "/profile" | "/admin" | "/support"; params?: { section: string }; label: string; short: string; mark: string; tone: string };
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
  { title: "My prep material", items: PREP_SECTIONS.map((p) => (p.slug === "gk" ? { to: "/gk" as const, label: p.label, short: "GK", mark: p.mark, tone: "bg-ink text-ink-foreground" } : { to: "/prep/$section" as const, params: { section: p.slug }, label: p.label, short: "Prep", mark: p.mark, tone: "bg-ink text-ink-foreground" })) as NavItem[] },
  { title: "Account", items: [
    { to: "/profile", label: "My profile", short: "Profile", mark: "PR", tone: "bg-accent text-accent-foreground" },
    { to: "/support", label: "Help & Support", short: "Help", mark: "HS", tone: "bg-secondary text-primary" },
  ] },
];
const MOBILE: NavItem[] = [GROUPS[0].items[0], GROUPS[1].items[1], GROUPS[2].items[0], GROUPS[0].items[1], GROUPS[3].items[0]];
const navKey = (n: NavItem) => n.to + (n.params?.section ?? "");

function NavLink({ n }: { n: NavItem }) {
  const base = "student-nav-link group flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-200";
  return <Link to={n.to} params={n.params as never} className={`${base} text-muted-foreground hover:translate-x-0.5 hover:bg-secondary hover:text-foreground`} activeProps={{ className: `${base} bg-secondary font-semibold text-primary shadow-[inset_3px_0_0_var(--primary)]` }}>
    <span className={`grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-bold text-primary`}>{n.mark}</span>
    <span className="min-w-0 leading-tight">{n.label}</span>
  </Link>;
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = GROUPS.flatMap((g) => g.items).find((n) => n.params ? path === `/prep/${n.params.section}` : path === n.to);
  const { data: me } = useQuery(meQuery); const qc = useQueryClient(); const navigate = useNavigate();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: "/", replace: true }); }
  const name = me?.profile?.full_name || "Student";
  const initials = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const groups = me?.isAdmin ? [...GROUPS, { title: "Administration", items: [{ to: "/admin", label: "Admin portal", short: "Admin", mark: "AD", tone: "bg-ink text-ink-foreground" } as NavItem] }] : GROUPS;
  return <div className="student-shell min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md">
      <div className="grid h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 md:px-7">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3"><Logo /><span className="hidden border-l pl-3 text-xs leading-tight text-muted-foreground lg:block"><span className="block font-semibold text-foreground">AI Interview</span>Performance workspace</span></Link>
        <div className="flex shrink-0 items-center gap-2 md:gap-3"><Button variant="outline" size="sm" className="md:hidden" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? "Close" : "Menu"}</Button>
          <Link to="/slots" className="hidden items-center gap-2 rounded-full border bg-secondary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary/40 sm:flex"><span className="size-1.5 rounded-full bg-success motion-safe:animate-pulse" />{me?.credits ?? "—"} credits</Link>
          <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/slots">Book interview</Link></Button>
          <div className="mx-1 hidden h-8 w-px bg-border md:block" />
          <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-sky text-xs font-bold text-primary-foreground shadow-soft">{initials}</span><span className="hidden text-xs leading-tight sm:block"><span className="block text-muted-foreground">Welcome</span><span className="font-semibold">{name.split(" ")[0]}</span></span></div>
          <Button onClick={signOut} variant="ghost" size="sm">Logout</Button>
        </div>
      </div>
    </header>
    {menuOpen && <nav aria-label="Student menu" className="fixed inset-x-0 top-[72px] bottom-16 z-40 overflow-y-auto border-b bg-card p-5 md:hidden">{groups.map((g) => <div key={g.title} className="mb-5"><p className="student-eyebrow mb-2">{g.title}</p><div onClick={() => setMenuOpen(false)} className="grid gap-1">{g.items.map((n) => <NavLink key={navKey(n)} n={n} />)}</div></div>)}</nav>}
    <div className="flex">
      <aside aria-label="Student navigation" className="student-sidebar sticky top-[72px] hidden h-[calc(100dvh-72px)] w-60 shrink-0 flex-col overflow-y-auto border-r bg-card px-4 pb-5 pt-6 md:flex">
        <div className="mb-6 border-b px-3 pb-5"><p className="student-eyebrow">Student workspace</p><p className="mt-1 text-sm font-semibold">Your next chapter starts here.</p></div>
        {groups.map((g, gi) => <div key={g.title} style={{ "--i": gi } as React.CSSProperties} className="animate-reveal mb-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase text-muted-foreground">{g.title}</p>
          <nav className="grid gap-1">{g.items.map((n) => <NavLink key={navKey(n)} n={n} />)}</nav>
        </div>)}
        <div className="mt-auto border-t px-3 pt-5"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Interview credits</p><p className="text-2xl font-bold text-primary">{me?.credits ?? "—"}</p></div><Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to="/slots">Explore courses</Link></Button></div>
      </aside>
      <main className="student-content mx-auto min-w-0 max-w-[1600px] flex-1 px-4 py-6 pb-28 md:px-7 md:pb-10 xl:px-10">
        <div className="mb-6 flex items-center justify-between gap-3 border-b pb-4 text-xs text-muted-foreground"><p>MBA Compass <span className="mx-2 text-border">/</span><span className="font-semibold text-foreground">{current?.label ?? "My interview"}</span></p><span className="hidden sm:block">AI Interview Suite</span></div>
        <div className="animate-fade"><Outlet /></div>
      </main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pb-safe backdrop-blur-md md:hidden">{MOBILE.map((n) => <Link key={navKey(n)} to={n.to} params={n.params as never} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground" activeProps={{ className: "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-primary" }}>{({ isActive }) => <><span className={`grid size-7 place-items-center rounded-md text-[9px] font-bold ${isActive ? n.tone : "bg-secondary text-muted-foreground"}`}>{n.mark}</span>{n.short}</>}</Link>)}</nav>
  </div>;
}
