import type React from "react";
import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { staffAccess, ROLE_LABEL, type StaffRole } from "@/lib/admin-utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin portal — MBA Compass AI Interview" }, { name: "description", content: "Secure administrator portal for MBA Compass AI Interview." }, { property: "og:title", content: "Admin portal — MBA Compass" }, { property: "og:description", content: "Manage users, interviews, slots, credits, resources and support." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { staff: null as null | { id: string; email: string; name: string; roles: string[] } };
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle(),
    ]);
    return { staff: { id: data.user.id, email: data.user.email ?? "", name: profile?.full_name || data.user.email || "Admin", roles: (roles ?? []).map((r) => r.role as string) } };
  },
  component: AdminLayout,
});

const NAV: { to: string; label: string }[] = [
  { to: "/admin", label: "Dashboard" }, { to: "/admin/users", label: "Users" }, { to: "/admin/courses", label: "Courses" }, { to: "/admin/purchases", label: "Course Purchases" },
  { to: "/admin/interviews", label: "Interview Manager" }, { to: "/admin/slots", label: "Slot Manager" }, { to: "/admin/colleges", label: "Colleges" }, { to: "/admin/training", label: "AI Training" }, { to: "/admin/resumes", label: "Resume Analyzer" }, { to: "/admin/credits", label: "Interview Credits" },
  { to: "/admin/resources", label: "Prep Material" }, { to: "/admin/announcements", label: "Announcements" }, { to: "/admin/downloads", label: "Resource Downloads" }, { to: "/admin/support", label: "Support Tickets" },
  { to: "/admin/documents", label: "User Documents" }, { to: "/admin/reports", label: "Reports & Exports" }, { to: "/admin/settings", label: "Admin Settings" }, { to: "/admin/audit", label: "Audit Logs" },
];

function AdminLayout() {
  const { staff } = Route.useRouteContext();
  if (!staff) return <AdminLogin />;
  const access = staffAccess(staff.roles);
  if (!access.isStaff) return <NoAccess email={staff.email} />;
  return <AdminShell name={staff.name} roles={staff.roles} />;
}

function useSignOut() {
  const qc = useQueryClient(); const navigate = useNavigate(); const router = useRouter();
  return async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await router.invalidate(); navigate({ to: "/admin", replace: true }); };
}

function AdminShell({ name, roles }: { name: string; roles: string[] }) {
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const role = (roles.find((r) => r in ROLE_LABEL) ?? "admin") as StaffRole;
  const nav = <nav className="grid gap-0.5">{NAV.map((n, i) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: n.to === "/admin" }} className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-ink-muted transition-all hover:translate-x-0.5 hover:bg-ink-foreground/10 hover:text-ink-foreground" activeProps={{ className: "flex items-center gap-3 rounded-lg bg-ink-foreground/15 px-2.5 py-2 text-sm font-semibold text-ink-foreground shadow-[inset_3px_0_0_var(--sky)]" }}><span className="grid size-6 shrink-0 place-items-center rounded-md bg-ink-foreground/10 text-[10px] font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span><span className="truncate">{n.label}</span></Link>)}</nav>;
  return <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</Button><Link to="/admin"><Logo /></Link><span className="hidden rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-foreground sm:inline">Admin portal</span></div>
        <div className="flex items-center gap-3"><div className="hidden text-right text-xs leading-tight sm:block"><p className="font-semibold">{name}</p><p className="text-muted-foreground">{ROLE_LABEL[role]}</p></div><span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-ink to-primary text-xs font-bold text-primary-foreground">{name.slice(0, 1).toUpperCase()}</span><Button variant="ghost" size="sm" onClick={signOut}>Logout</Button></div>
      </div>
    </header>
    <div className="flex">
      <aside className={`${open ? "fixed inset-x-0 top-16 bottom-0 z-40 flex" : "hidden"} w-full flex-col gap-4 overflow-y-auto bg-ink p-3 text-ink-foreground lg:sticky lg:top-16 lg:flex lg:h-[calc(100dvh-4rem)] lg:w-64 lg:shrink-0`}>
        <p className="px-2.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Administration</p>
        {nav}
        <div className="mt-auto rounded-xl bg-ink-foreground/10 p-3 text-xs text-ink-muted">Signed in as <span className="font-semibold text-ink-foreground">{ROLE_LABEL[role]}</span>. Actions are recorded in the audit log.</div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8"><div className="mx-auto grid max-w-7xl gap-6 animate-fade"><Outlet /></div></main>
    </div>
  </div>;
}

function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error("Incorrect email or password.");
    await router.invalidate();
  }
  return <div className="auth-shell grid min-h-dvh place-items-center p-4">
    <form onSubmit={submit} className="animate-reveal w-full max-w-sm rounded-2xl border bg-card p-7 shadow-soft">
      <Logo />
      <span className="mt-5 inline-block rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-foreground">Admin portal</span>
      <h1 className="mt-3 text-2xl font-bold">Administrator sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Authorised staff only. All activity is logged.</p>
      <div className="mt-6 grid gap-4">
        <div className="grid gap-1.5"><Label htmlFor="ae">Email</Label><Input id="ae" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="ap">Password</Label><Input id="ap" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in to admin"}</Button>
        <Link to="/" className="text-center text-xs text-muted-foreground hover:text-primary">Student sign in</Link>
      </div>
    </form>
  </div>;
}

function NoAccess({ email }: { email: string }) {
  const signOut = useSignOut();
  return <div className="auth-shell grid min-h-dvh place-items-center p-4"><div className="w-full max-w-sm rounded-2xl border bg-card p-7 text-center shadow-soft"><Logo /><h1 className="mt-5 text-xl font-bold">No admin access</h1><p className="mt-2 text-sm text-muted-foreground">{email} is not an authorised administrator.</p><div className="mt-5 grid gap-2"><Button onClick={signOut}>Sign in with another account</Button><Button asChild variant="ghost"><Link to="/dashboard">Go to student dashboard</Link></Button></div></div></div>;
}
