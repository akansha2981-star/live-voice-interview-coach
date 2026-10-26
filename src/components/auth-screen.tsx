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
    <aside className="hidden min-h-dvh flex-col justify-center px-10 py-8 lg:flex xl:px-16">
      <div className="mx-auto w-full max-w-md">
      <p className="text-sm font-semibold text-primary">MBA Compass · AI Interview Suite</p>
      <p className="mt-8 text-xs font-semibold text-muted-foreground">Your next chapter starts here</p>
      <h2 className="mt-3 text-4xl font-bold leading-tight">MBA interview practice.<br /><span className="text-primary">Make your answers count.</span></h2>
      <div className="mt-8 grid grid-cols-[auto_1fr] items-center gap-6 border-y py-6">
        <ScoreRing value={82} size={96} label="Overall" tone="primary" />
        <div className="grid gap-3"><p className="text-xs text-muted-foreground">Sample performance</p>{HIGHLIGHTS.slice(0,3).map((h) => <div key={h.k}><div className="flex justify-between gap-3 text-xs"><span>{h.k}</span><span className="font-semibold text-primary">{h.v}</span></div><GrowBar value={h.v} tone="bg-primary" className="mt-1" /></div>)}</div>
      </div>
      <div className="mt-6 h-24"><div key={qi} className="animate-rise"><p className="text-lg leading-relaxed">{QUOTES[qi].q}</p><p className="mt-2 text-xs text-muted-foreground">{QUOTES[qi].t}</p></div></div>
      </div>
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
    <div className="auth-shell auth-layout min-h-dvh">
      <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-6 sm:px-12">
        <div className="w-full max-w-md animate-rise">
          <div>
            <div className="flex items-center gap-3"><FullLogo className="h-14 w-16 object-contain" /><div><p className="font-bold">MBA Compass</p><p className="text-xs text-muted-foreground">Student interview portal</p></div></div>
            <h1 className="mt-5 text-3xl font-bold">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your student account" : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your student dashboard.</p>
          </div>

          <div className="mt-5">
            {mode !== "forgot" && <><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button><Button variant="outline" onClick={() => oauth("lovable")}>With Lovable</Button></div><div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" /></div></>}
            {mode !== "forgot" && (
              <div className="relative grid grid-cols-2 rounded-md bg-muted p-1 text-sm font-bold">
                <span
                  className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm transition-all duration-300 ${mode === "signup" ? "left-1/2" : "left-1"}`}
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
                  <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                    placeholder="Enter your password"
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

          </div>
          <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">Your data is private to you and MBA Compass.</p>
        </div>
      </div>
      <IntroPanel />
      </div>
    </div>
  );
}
