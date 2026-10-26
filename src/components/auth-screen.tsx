import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullLogo } from "@/components/logo";
import { GrowBar, ScoreRing } from "@/components/motion";

function safeRedirect(r?: string) {
  if (!r) return "/dashboard";
  try {
    const u = new URL(r, window.location.origin);
    return u.origin === window.location.origin && !u.pathname.startsWith("/auth") && u.pathname !== "/"
      ? u.pathname + u.search
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

const HIGHLIGHTS = [
  { k: "Communication", v: 86 },
  { k: "Structure (STAR)", v: 78 },
  { k: "Business acumen", v: 72 },
  { k: "Eye contact", v: 91 },
];

const QUOTES = [
  { q: "“Walk me through your decision to pursue an MBA right now.”", t: "Motivation · Question 2 of 8" },
  { q: "“Estimate the number of cups of tea sold in Pune every day.”", t: "Guesstimate · Question 6 of 8" },
  { q: "“Tell me about a time you led a team through a setback.”", t: "Behavioural · Question 4 of 8" },
];

/** Animated introduction panel: sample scorecard, rotating interview highlights, platform stats. */
function IntroPanel() {
  const [qi, setQi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setQi((i) => (i + 1) % QUOTES.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <aside className="hidden h-[460px] w-full max-w-md flex-col justify-center border-l border-primary/20 bg-secondary px-8 py-7 lg:flex">
      <p className="text-xs font-semibold text-primary">MBA Compass · Interview practice</p>
      <h2 className="mt-3 text-3xl font-bold leading-tight">A little practice.<br /><span className="text-primary">A stronger first impression.</span></h2>
      <div className="mt-7 grid grid-cols-[auto_1fr] items-center gap-5">
        <ScoreRing value={82} size={96} label="Overall" tone="primary" />
        <div className="grid gap-3"><p className="text-xs text-muted-foreground">Sample performance</p>{HIGHLIGHTS.slice(0,3).map((h) => <div key={h.k}><div className="flex justify-between gap-3 text-xs"><span>{h.k}</span><span className="font-semibold text-primary">{h.v}</span></div><GrowBar value={h.v} tone="bg-primary" className="mt-1" /></div>)}</div>
      </div>
      <div className="mt-7 h-24 border-t pt-4"><div key={qi} className="animate-rise"><p className="text-sm leading-relaxed">{QUOTES[qi].q}</p><p className="mt-2 text-xs text-muted-foreground">{QUOTES[qi].t}</p></div></div>
    </aside>
  );
}

export function AuthScreen({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safeRedirect(redirect), replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: safeRedirect(redirect), replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  }

  return (
    <div className="auth-layout flex min-h-dvh items-center justify-center bg-card px-5 py-5 sm:px-10">
      <div className="flex w-full max-w-5xl items-center justify-center gap-16">
      <div className="flex w-full max-w-sm shrink-0 items-center justify-center">
        <div className="w-full max-w-md animate-rise">
          <div className="flex flex-col items-center text-center">
            <FullLogo className="h-20 w-32 object-contain" />
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
              Student portal · Secure access
            </p>
            <h1 className="mt-3 text-2xl font-bold">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your student account" : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Use the email registered with MBA Compass.</p>
          </div>

          <div className="mt-5">
            {mode !== "forgot" && (
              <div className="relative grid grid-cols-2 rounded-md bg-muted p-1 text-sm font-bold">
                <span
                  className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm transition-transform duration-300 ${mode === "signup" ? "translate-x-[calc(100%+0px)]" : ""}`}
                  style={{ left: 4 }}
                />
                {(["signin", "signup"] as const).map((m) => (
                  <Button
                    variant="ghost"
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`relative h-8 rounded-md transition-colors ${mode === m ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {m === "signin" ? "Login" : "Sign up"}
                  </Button>
                ))}
              </div>
            )}

            <form key={mode} onSubmit={submit} className="mt-4 grid animate-fade gap-3">
              {mode === "signup" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {mode !== "forgot" && (
                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <Button variant="link" type="button" className="h-auto p-0 text-xs font-semibold" onClick={() => setMode("forgot")}>
                        Forgot password?
                      </Button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <Button type="submit" size="lg" disabled={busy} className="mt-1 text-base font-bold">
                {busy ? "Please wait…" : mode === "signin" ? "Login" : mode === "signup" ? "Create account" : "Send reset link"}
              </Button>
              {mode === "forgot" && (
                <Button variant="ghost" type="button" onClick={() => setMode("signin")}>
                  Back to login
                </Button>
              )}
            </form>

            {mode !== "forgot" && (
              <>
                <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => oauth("google")}>
                    Continue with Google
                  </Button>
                  <Button variant="outline" type="button" onClick={() => oauth("lovable")}>
                    Continue with Lovable
                  </Button>
                </div>
              </>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Your data is private to you and MBA Compass.</p>
        </div>
      </div>
      <IntroPanel />
      </div>
    </div>
  );
}
