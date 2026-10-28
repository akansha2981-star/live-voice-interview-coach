import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { FullLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PrebookDialog } from "@/components/prebook-dialog";
import { LAUNCH_HEADLINE, LAUNCH_LABEL, LAUNCH_SHORT_LABEL, daysToLaunch, prebookProgress } from "@/lib/launch";

const OFFERINGS = [
  ["01", "A live interview with Aria", "Real voice questions, follow-ups and college-specific practice — everything visible on screen."],
  ["02", "A report you can act on", "Answer-level analysis, full transcript, communication observations and a seven-day practice plan."],
  ["03", "Your documents, stronger", "ATS-focused resume review with a recreated resume, plus detailed section-level SOP feedback."],
];

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

/** Pre-launch splash: sign-in is closed until launch, so visitors are invited to prebook instead. */
export function LaunchNoticeScreen({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [prebookOpen, setPrebookOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [days, setDays] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setDays(daysToLaunch());
    setProgress(Math.round(prebookProgress() * 100));
    supabase.auth.getSession().then(({ data }) => {
      // Signed-in visitors stay here: the workspace gate decides who may enter before launch.
      setSignedIn(!!data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && redirect) navigate({ to: safeRedirect(redirect), replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirect]);

  if (checking) return <div className="launch-notice" aria-busy="true" />;

  return <div className="launch-notice">
    <div className="launch-notice-main">
      <div className="launch-notice-inner animate-rise">
        <div className="flex items-center gap-3">
          <FullLogo className="h-14 w-16 object-contain" />
          <div><p className="font-bold">MBA Compass</p><p className="text-xs text-muted-foreground">The AI interview experience</p></div>
        </div>
        <p className="launch-notice-badge"><span className="course-live-dot" /> Pre-launch · Limited seats</p>
        <h1>We will be live on<br /><em>{LAUNCH_LABEL}.</em></h1>
        <p className="launch-notice-copy">Student sign-in opens with the first batch on {LAUNCH_LABEL}. Reserve your seat now for ₹1 and we will email you the moment your dashboard is ready.</p>
        {signedIn && <p className="launch-notice-copy">You're signed in. Your dashboard opens once you've bought a full course, or on {LAUNCH_LABEL}. <button type="button" className="underline" onClick={async () => { await supabase.auth.signOut(); setSignedIn(false); }}>Sign out</button></p>}
        <div className="launch-notice-actions">
          <Button size="lg" onClick={() => setPrebookOpen(true)}>Prebook now at just ₹1</Button>
          <Button size="lg" variant="outline" asChild><Link to="/courses">See how it works</Link></Button>
        </div>
        <div className="launch-notice-meta"><span>{days} days to launch</span><span>Real voice interviews with Aria</span><span>Detailed report after every mock</span></div>
      </div>
    </div>
    <aside className="launch-notice-side">
      <div className="launch-notice-card">
        <h2>What opens on {LAUNCH_SHORT_LABEL}</h2>
        {OFFERINGS.map(([n, t, d]) => <div className="launch-notice-row" key={n}><span>{n}</span><div><b>{t}</b><p>{d}</p></div></div>)}
        <div className="launch-notice-count"><span>Days to launch</span><strong>{days}</strong></div>
        <div className="launch-notice-bar" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} /></div>
        <p className="launch-notice-foot">The prebook window closes on {LAUNCH_LABEL}. The ₹1 reserves an early-bird seat only — no account is created and no interview credits are added.</p>
      </div>
    </aside>
    <PrebookDialog open={prebookOpen} onOpenChange={setPrebookOpen} />
  </div>;
}

/** Launch line shown directly below the prebook strip on public pages. */
export function LaunchBand() {
  return <div className="course-launch-band"><div className="course-container">
    <b>{LAUNCH_HEADLINE}</b>
    <span className="course-launch-seats">Limited seats</span>
  </div></div>;
}
