import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, ScanFace, FileText, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MBA Compass AI Interview — Live mock interviews with AI" },
      {
        name: "description",
        content: "Practise real-time spoken interviews with an AI interviewer and get a detailed, evidence-based performance report.",
      },
      { property: "og:title", content: "MBA Compass AI Interview" },
      { property: "og:description", content: "Live AI mock interviews with scores, transcripts and an improvement plan." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Mic, title: "Live voice interviewer", body: "A natural spoken conversation that adapts to your resume and follows up on your answers." },
  { icon: ScanFace, title: "Presentation coaching", body: "Private, in-browser feedback on framing, posture and camera eye-line — observable signals only." },
  { icon: FileText, title: "Evidence-based report", body: "Scores across six dimensions, question-by-question evaluation and stronger sample answers." },
  { icon: LineChart, title: "Track your progress", body: "Every interview is saved so you can watch your readiness improve over time." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-4">
          <header className="flex h-20 items-center justify-between">
            <Logo inverted />
            <Button asChild variant="secondary" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </header>
          <div className="grid items-center gap-12 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">For MBA Compass students</p>
              <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">
                Walk into your interview <em className="text-accent">already rehearsed.</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-muted">
                Sit a realistic, spoken mock interview with Aria, our AI interviewer. Get an honest report on what you said,
                how you said it, and exactly what to work on next.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/auth">Start practising</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src={hero}
                alt="Student taking a video interview at a desk"
                className="aspect-[5/4] w-full rounded-2xl object-cover shadow-soft"
              />
              <div className="absolute -bottom-6 -left-6 hidden rounded-xl bg-card p-4 text-card-foreground shadow-soft md:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Interview readiness</p>
                <p className="font-display text-3xl font-semibold">78<span className="text-base text-muted-foreground">/100</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-6">
            <f.icon className="mb-4 size-6 text-accent" />
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MBA Compass · B-School Buzz
      </footer>
    </div>
  );
}
