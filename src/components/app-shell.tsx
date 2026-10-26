import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function AppShell() {
  const { data: me } = useQuery(meQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkClass = "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const active = { className: "rounded-md px-3 py-2 text-sm font-semibold text-foreground bg-secondary" };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link to="/dashboard" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link to="/dashboard" className={linkClass} activeProps={active}>
              Dashboard
            </Link>
            <Link to="/profile" className={linkClass} activeProps={active}>
              Profile
            </Link>
            {me?.isAdmin && (
              <Link to="/admin" className={linkClass} activeProps={active}>
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">{me?.profile?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 px-4 pb-2 sm:hidden">
          <Link to="/dashboard" className={linkClass} activeProps={active}>
            Dashboard
          </Link>
          <Link to="/profile" className={linkClass} activeProps={active}>
            Profile
          </Link>
          {me?.isAdmin && (
            <Link to="/admin" className={linkClass} activeProps={active}>
              Admin
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
