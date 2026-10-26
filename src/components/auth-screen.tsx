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
import { AnimatedNumber, GrowBar, ScoreRing } from "@/components/motion";

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
    <div className="relative hidden overflow-hidden bg-gradient-panel p-10 text-foreground lg:flex lg:flex-col xl:p-14">
      <div className="pointer-events-none absolute -right-24 -top-24 size-[22rem] rounded-full border border-primary/10 animate-orbit">
        <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-accent" />
      </div>

      <p className="animate-rise text-xs font-bold uppercase tracking-[0.28em] text-primary">MBA Compass · AI Interview Suite</p>
      <h2 className="mt-4 max-w-md animate-rise text-4xl font-bold leading-tight xl:text-5xl" style={{ animationDelay: "80ms" }}>
        Practise the interview. <span className="text-primary">Walk in ready.</span>
      </h2>
      <p className="mt-4 max-w-md animate-rise text-muted-foreground" style={{ animationDelay: "160ms" }}>
        Live spoken mock interviews with an AI panelist, real-time presence coaching and a detailed scorecard after every session.
      </p>

      <div className="relative mt-10 grid max-w-xl grid-cols-[auto_1fr] items-center gap-8 rounded-2xl border bg-card p-6 shadow-soft animate-float">
        <div className="text-primary">
          <ScoreRing value={82} size={132} label="Overall" tone="primary" />
        </div>
        <div className="grid gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Sample scorecard</p>
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.k} className="animate-rise" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{h.k}</span>
                <span className="font-bold text-primary">{h.v}</span>
              </div>
              <GrowBar value={h.v} tone={i % 2 ? "bg-sky" : "bg-primary"} className="mt-1" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-8 h-24 max-w-xl">
        <div key={qi} className="absolute inset-0 animate-rise rounded-2xl border-l-4 border-primary bg-card p-5 shadow-soft">
          <p className="text-lg leading-snug">{QUOTES[qi].q}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky">{QUOTES[qi].t}</p>
        </div>
      </div>

      <div className="mt-auto grid max-w-xl grid-cols-3 gap-4 pt-10">
        {[
          { v: 1200, s: "+", l: "Mock interviews" },
          { v: 34, s: "%", l: "Avg. score uplift" },
          { v: 15, s: " min", l: "Per session" },
        ].map((x) => (
          <div key={x.l} className="border-t border-border pt-3">
            <p className="text-3xl font-bold text-primary">
              <AnimatedNumber value={x.v} suffix={x.s} duration={1600} />
            </p>
            <p className="text-xs text-muted-foreground">{x.l}</p>
          </div>
        ))}
      </div>
    </div>
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
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <IntroPanel />
      <div className="flex min-h-screen items-center justify-center p-5 pt-safe pb-safe sm:p-10">
        <div className="w-full max-w-md animate-rise">
          <div className="flex flex-col items-center text-center">
            <FullLogo className="h-24 w-24 object-contain" />
            <p className="mt-3 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground">
              Student portal · Secure access
            </p>
            <h1 className="mt-5 text-3xl font-bold">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your student account" : "Reset your password"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Use the email registered with MBA Compass.</p>
          </div>

          <div className="mt-7 rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
            {mode !== "forgot" && (
              <div className="relative grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-bold">
                <span
                  className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-card shadow-sm transition-transform duration-300 ${mode === "signup" ? "translate-x-[calc(100%+0px)]" : ""}`}
                  style={{ left: 4 }}
                />
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`relative rounded-md py-2 transition-colors ${mode === m ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {m === "signin" ? "Login" : "Sign up"}
                  </button>
                ))}
              </div>
            )}

            <form key={mode} onSubmit={submit} className="mt-5 grid animate-fade gap-4">
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
                      <button type="button" className="text-xs font-bold text-sky hover:underline" onClick={() => setMode("forgot")}>
                        Forgot password?
                      </button>
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
                <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("signin")}>
                  Back to login
                </button>
              )}
            </form>

            {mode !== "forgot" && (
              <>
                <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> or continue with <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => oauth("google")}>
                    Continue with Google
                  </Button>
                  <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
                    Continue with Lovable
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Your data is private to you and MBA Compass.</p>
        </div>
      </div>
    </div>
  );
}
