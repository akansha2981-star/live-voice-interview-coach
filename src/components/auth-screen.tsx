import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullLogo } from "@/components/logo";

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

/** Blurred, non-interactive preview of the student dashboard shown behind the sign-in card. */
function LockedBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none overflow-hidden blur-[6px]">
      <div className="hidden w-64 shrink-0 flex-col gap-3 bg-gradient-ink p-6 md:flex">
        <div className="mb-6 h-10 w-40 rounded-lg bg-ink-foreground/15" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-9 rounded-lg ${i === 0 ? "bg-accent/70" : "bg-ink-foreground/10"}`} />
        ))}
      </div>
      <div className="flex-1 bg-background p-8">
        <div className="mb-8 h-10 w-72 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {["bg-primary", "bg-accent", "bg-sky", "bg-success"].map((c) => (
            <div key={c} className="h-32 rounded-2xl border bg-card p-5">
              <div className={`mb-4 size-8 rounded-lg ${c}`} />
              <div className="h-6 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-64 rounded-2xl border bg-card" />
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
    <div className="relative min-h-screen overflow-hidden">
      <LockedBackdrop />
      <div className="absolute inset-0 bg-ink/55" />
      <div className="relative flex min-h-screen items-center justify-center p-4 pt-safe pb-safe">
        <div className="w-full max-w-md animate-rise overflow-hidden rounded-2xl border bg-card shadow-soft">
          <div className="h-1.5 bg-gradient-to-r from-primary via-sky to-accent" />
          <div className="p-7 sm:p-9">
            <div className="flex flex-col items-center text-center">
              <FullLogo className="h-24 w-24 object-contain" />
              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
                <Lock className="size-3" /> Student portal · Secure access
              </div>
              <h1 className="mt-4 text-2xl font-semibold">
                {mode === "signin" ? "Sign in to your dashboard" : mode === "signup" ? "Create your student account" : "Reset your password"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Use the email registered with MBA Compass.</p>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md py-2 transition-all ${mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {m === "signin" ? "Login" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 grid gap-4">
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
                      <button type="button" className="text-xs font-semibold text-sky hover:underline" onClick={() => setMode("forgot")}>
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
              <Button type="submit" size="lg" disabled={busy}>
                {mode === "signin" ? "Login" : mode === "signup" ? "Create account" : "Send reset link"}
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
            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" /> Your data is private to you and MBA Compass.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
