import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Logo } from "@/components/logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", short: "Home" },
  { to: "/interview/check", label: "Interview", short: "Interview" },
  { to: "/slots", label: "Slots", short: "Slots" },
  { to: "/profile", label: "Profile", short: "Profile" },
] as const;

export function AppShell() {
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const initials = (me?.profile?.full_name || me?.profile?.email || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop / tablet left sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-ink text-ink-foreground md:flex">
        <div className="p-5">
          <Link to="/dashboard">
            <Logo inverted />
          </Link>
        </div>
        <nav className="grid gap-1 px-3">
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-muted">Menu</p>
          {NAV.map((n, i) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold bg-accent text-accent-foreground shadow-soft",
              }}
            >
              <span className="w-5 text-[11px] font-bold opacity-60">{String(i + 1).padStart(2, "0")}</span> {n.label}
            </Link>
          ))}
          {me?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
              activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold bg-accent text-accent-foreground" }}
            >
              <span className="w-5 text-[11px] font-bold opacity-60">05</span> Admin
            </Link>
          )}
        </nav>
        <div className="mx-3 mt-6 rounded-xl border border-ink-foreground/15 p-4">
          <p className="text-xs text-ink-muted">Slots available</p>
          <p className="font-display text-3xl font-semibold text-accent">{me?.credits ?? "–"}</p>
          <Link to="/slots" className="mt-1 inline-block text-xs font-semibold text-sky hover:underline">
            Buy more slots →
          </Link>
        </div>
        <div className="mt-auto flex items-center gap-3 border-t border-ink-foreground/10 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky text-xs font-bold text-ink">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{me?.profile?.full_name || "Student"}</p>
            <p className="truncate text-xs text-ink-muted">{me?.profile?.email}</p>
          </div>
          <button onClick={signOut} className="rounded-md px-2 py-1.5 text-xs font-bold text-ink-muted hover:bg-ink-foreground/10 hover:text-ink-foreground">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile app header */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-gradient-ink px-4 pb-3 pt-safe text-ink-foreground md:hidden">
          <div className="pt-3">
            <Logo inverted />
          </div>
          <button onClick={signOut} className="mt-3 rounded-md border border-ink-foreground/20 px-3 py-1.5 text-xs font-bold text-ink-muted">
            Sign out
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-8">
          <div key={typeof window !== "undefined" ? undefined : "ssr"} className="animate-fade"><Outlet /></div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card/95 pb-safe backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="group flex flex-col items-center gap-1.5 py-3 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "group active flex flex-col items-center gap-1.5 py-3 text-xs font-bold text-primary" }}
          >
            <span className="h-1 w-6 rounded-full bg-transparent transition-colors group-[.active]:bg-accent" />
            {n.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
