import type React from "react";
import { useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { staffAccess, ROLE_LABEL, type StaffRole } from "@/lib/admin-utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({ staticData: { sitemap: "exclude-subtree" },
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

const NAV_GROUPS = [
  { title: "Workspace", items: [{ to: "/admin", label: "Overview" }, { to: "/admin/users", label: "Students" }, { to: "/admin/support", label: "Support tickets" }] },
  { title: "Interviews", items: [{ to: "/admin/interviews", label: "Interview manager" }, { to: "/admin/slots", label: "Slots & schedule" }, { to: "/admin/credits", label: "Interview credits" }, { to: "/admin/reports", label: "Reports & exports" }] },
  { title: "Courses & payments", items: [{ to: "/admin/courses", label: "Courses" }, { to: "/admin/purchases", label: "Course purchases" }, { to: "/admin/prebookings", label: "Prebookings" }, { to: "/admin/finance", label: "Finance & costing" }] },
  { title: "AI & career tools", items: [{ to: "/admin/colleges", label: "Colleges" }, { to: "/admin/training", label: "AI training" }, { to: "/admin/resumes", label: "Resume analyzer" }, { to: "/admin/sop-reviews", label: "SOP reviews" }] },
  { title: "Content & resources", items: [{ to: "/admin/resources", label: "Prep material" }, { to: "/admin/gk", label: "GK management" }, { to: "/admin/announcements", label: "Announcements" }, { to: "/admin/downloads", label: "Resource opens" }, { to: "/admin/documents", label: "Student documents" }] },
  { title: "Administration", items: [{ to: "/admin/emails", label: "Email notifications" }, { to: "/admin/settings", label: "Settings" }, { to: "/admin/audit", label: "Audit logs" }] },
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
  const path = useRouterState({ select: (state) => state.location.pathname });
  const current = NAV_GROUPS.flatMap((g) => g.items).find((n) => n.to === path)?.label ?? "Administration";
  const nav = <>{NAV_GROUPS.map((g) => <section key={g.title} className="mb-5"><h2 className="px-3 pb-2 text-[10px] font-bold uppercase text-muted-foreground">{g.title}</h2><nav aria-label={g.title} className="grid gap-1">{g.items.map((n) => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} activeOptions={{ exact: n.to === "/admin" }} className="student-nav-link flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" activeProps={{ className: "student-nav-link flex items-center gap-3 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-primary" }}><span className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-bold text-primary">{n.label.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span><span>{n.label}</span></Link>)}</nav></section>)}</>;
  return <div className="student-shell min-h-screen">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-md"><div className="flex h-[72px] items-center justify-between gap-2 px-4 md:px-7">
      <div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="sm" className="lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</Button><Link to="/admin"><Logo /></Link><span className="hidden border-l pl-3 text-xs leading-tight text-muted-foreground md:block"><span className="block font-semibold text-foreground">Administration</span>MBA Compass workspace</span></div>
      <div className="flex items-center gap-2"><span className="hidden rounded-full border bg-secondary px-3 py-1.5 text-xs font-semibold text-primary sm:block">{ROLE_LABEL[role]}</span><span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">{name.slice(0, 1).toUpperCase()}</span><span className="hidden text-xs font-semibold md:block">{name.split(" ")[0]}</span><Button variant="ghost" size="sm" onClick={signOut}>Logout</Button></div>
    </div></header>
    <div className="flex"><aside aria-label="Admin navigation" className={`student-sidebar ${open ? "fixed inset-x-0 top-[72px] bottom-0 z-40 flex" : "hidden"} w-full flex-col overflow-y-auto border-r bg-card px-4 py-5 lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100dvh-72px)] lg:w-60 lg:shrink-0`}>
      <div className="mb-5 border-b px-3 pb-4"><p className="student-eyebrow">Admin workspace</p><p className="mt-1 text-sm font-semibold">Manage every student journey.</p></div>{nav}<div className="mt-auto border-t px-3 pt-4 text-xs text-muted-foreground">{ROLE_LABEL[role]} access<span className="mt-1 block">MBA Compass AI Interview</span></div>
    </aside><main className="student-content mx-auto min-w-0 max-w-[1600px] flex-1 px-4 py-6 md:px-7 xl:px-10"><div className="mb-6 flex items-center justify-between border-b pb-4 text-xs text-muted-foreground"><p>MBA Compass <span className="mx-2">/</span><span className="font-semibold text-foreground">{current}</span></p><span className="hidden sm:block">Admin workspace</span></div><div className="grid min-w-0 gap-6 animate-fade"><Outlet /></div></main></div>
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
      <span className="mt-5 inline-block rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase text-primary">Admin portal</span>
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
