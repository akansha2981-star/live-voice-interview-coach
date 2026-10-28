import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PrebookDialog } from "@/components/prebook-dialog";
import { CourseComparison, CourseTestimonials, CourseFAQs } from "@/components/course-launch-extras";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FullLogo } from "@/components/logo";
import { CourseFeatureVisual } from "@/components/course-feature-visual";
import { CourseCollegeLogos } from "@/components/course-college-logos";
import { CourseInterviewDemo } from "@/components/course-interview-demo";
import { CourseHistoricalResults, CourseApproachComparison } from "@/components/course-evidence-sections";
import { CourseReportPreview, CourseReadinessPreview } from "@/components/course-previews";
import { LaunchBand } from "@/components/course-launch-notice";
import { getPublicCourses } from "@/lib/public-courses.functions";
import interviewPhoto from "@/assets/courses-interview.jpg";

const catalogQuery = queryOptions({ queryKey: ["public-course-catalog"], queryFn: () => getPublicCourses(), staleTime: 30_000, refetchInterval: 30_000 });
const description = "MBA Compass AI mock interviews launch on 29th November 2026. Prebook your seat for ₹1: live AI interviews with Aria, detailed reports, ATS Resume Builder and SOP reviews.";
export const Route = createFileRoute("/courses")({
  staticData: { sitemap: true },
  head: () => ({ meta: [
    { title: "MBA Mock Interviews · Launching 29 November 2026 — MBA Compass" },
    { name: "description", content: description },
    { property: "og:title", content: "AI MBA Mock Interviews — MBA Compass" },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: "https://live-voice-interview-coach.lovable.app/courses" },
    { name: "twitter:card", content: "summary_large_image" },
  ], links: [{ rel: "canonical", href: "https://live-voice-interview-coach.lovable.app/courses" }], scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: "MBA Compass AI Mock Interview Courses", description, url: "https://live-voice-interview-coach.lovable.app/courses" }) }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CoursesPage,
});

function CoursesPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const pageRef = useRef<HTMLDivElement>(null);
  const [prebookOpen, setPrebookOpen] = useState(false);
  const prebook = () => setPrebookOpen(true);
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const enabled = !reduced.matches && window.innerWidth >= 768;
      root.style.setProperty("--course-parallax", `${enabled ? Math.min(window.scrollY * 0.13, 80) : 0}px`);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    reduced.addEventListener("change", scroll);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-revealed"); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    root.querySelectorAll(".course-section-heading, .course-feature, .course-step, .course-readiness-demo").forEach(el => {
      el.classList.add("course-scroll-reveal"); observer.observe(el);
    });
    update();
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); reduced.removeEventListener("change", scroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  return <div className="course-page" ref={pageRef}>
    <div className="course-first-banner"><div className="course-container"><span className="course-live-dot" /><b>India’s First and Only</b><span> AI Mock Interview Preparation</span><button type="button" className="prebook-pill" onClick={() => setPrebookOpen(true)}>Prebook now at just ₹1</button></div></div>
    <PrebookDialog open={prebookOpen} onOpenChange={setPrebookOpen} />
    <LaunchBand onPrebook={prebook} />
    <header className="course-header"><div className="course-container flex items-center justify-between gap-4"><Link to="/courses" aria-label="MBA Compass courses"><span className="course-brand"><FullLogo className="h-14 w-20 object-contain" /><span><b>MBA Compass</b><small>THE AI INTERVIEW EXPERIENCE</small></span></span></Link><nav aria-label="Course navigation" className="hidden items-center gap-1 md:flex"><Button variant="ghost" onClick={() => scrollTo("experience")}>The experience</Button><Button variant="ghost" onClick={() => scrollTo("report")}>Your report</Button><Button variant="ghost" onClick={() => scrollTo("plans")}>Courses</Button><Button variant="ghost" onClick={() => scrollTo("faqs")}>FAQs</Button></nav><div className="flex shrink-0 items-center gap-2"><Button size="sm" className="course-header-buy" onClick={prebook}>Prebook at ₹1</Button></div></div></header>
    <main>
      <section className="course-hero"><img src={interviewPhoto} width={1920} height={1024} fetchPriority="high" alt="MBA aspirant practising a professional interview with her laptop" className="course-hero-photo" /><div className="course-container relative"><div className="course-hero-copy"><p className="course-eyebrow hero-label"><span className="course-live-dot" /> INDIA’S FIRST AND ONLY AI MOCK INTERVIEW PREPARATION</p><h1>MBA Mock Interviews.<br /><span className="text-primary">Powered by AI.</span></h1><p className="mt-6 max-w-lg text-lg text-muted-foreground">Aria, your AI interviewer, goes live on 29th November 2026. Reserve your seat for ₹1 today — detailed reports, a free ATS-focused resume review and SOP feedback come with your workspace.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" variant="secondary" className="prebook-hero-btn" onClick={prebook}>Prebook at ₹1</Button><Button size="lg" variant="outline" onClick={() => scrollTo("demo")}>See the interview demo</Button></div><div className="course-hero-notes"><span>Real conversations</span><span>Detailed feedback</span><span>Your pace. Your progress.</span></div></div></div><div className="hero-sample-ticket"><span>PERFORMANCE REPORT</span><strong>Feedback.<br />Not just a score.</strong><div className="hero-ticket-lines"><i /><i /><i /></div><small>Answer insights · A clearer next step</small></div><div className="course-live-note"><span className="course-live-dot" /><div><b>Aria, your AI interviewer</b><p>Thoughtful questions. Natural follow-ups.</p></div><div className="course-voice-wave" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div></div></section>
      <div className="course-value-strip"><div className="course-container grid grid-cols-2 gap-6 md:grid-cols-4">{[["01", "Practise out loud"], ["02", "Understand every answer"], ["03", "Track your readiness"], ["04", "Prepare with purpose"]].map(([n, text]) => <div key={n} className="flex items-center gap-3"><span className="value-strip-number">{n}</span><p className="font-bold">{text}</p></div>)}</div></div>
      <CourseHistoricalResults />
      <CourseCollegeLogos />
      <section id="experience" className="course-section course-container"><div className="section-index">01 / THE EXPERIENCE</div><div className="course-section-heading"><p className="course-eyebrow">MORE THAN A MOCK INTERVIEW</p><h2>One workspace.<br />Your entire preparation journey.</h2><p>A conversation is just the beginning. Build your answers, sharpen your documents, and see what to work on next.</p></div><div className="course-feature-grid">{[
        ["01", "A real conversation with AI", "College-focused practice, answer-specific follow-ups and questions visible on screen.", "Live voice interviews"],
        ["02", "Feedback you can act on", "Question-level analysis, transcript evidence, stronger answer suggestions and a seven-day practice plan.", "Detailed interview reports"],
        ["03", "Progress you can see", "Your average score, interview history and a readiness scale that changes as you practise.", "Personal dashboard"],
        ["04", "A stronger first impression", "Resume review with ATS-focused feedback and a professionally recreated resume.", "Resume Builder"],
        ["05", "Your story, better expressed", "Detailed SOP feedback, section-level recommendations and a revised draft to review.", "AI SOP Review"],
        ["06", "Stay informed. Stay prepared.", "GK Hub, prep documents, sample SOPs, domain dossiers and published workshops in your workspace.", "Preparation resources"],
      ].map(([n, title, copy, label]) => <article key={n} className="course-feature"><div className="flex justify-between"><span className="course-feature-number">{n}</span><span className="text-xs font-bold text-muted-foreground">{label}</span></div><CourseFeatureVisual kind={n} /><h3 className="mt-7 text-xl font-bold">{title}</h3><p className="mt-3 text-muted-foreground">{copy}</p></article>)}</div><p className="mt-5 text-sm text-muted-foreground">Included credits and deliverables vary by course. Check the published course details before purchasing.</p><Button className="mt-6" onClick={prebook}>Prebook now at just ₹1</Button></section>
      <CourseInterviewDemo />
      <div className="course-container course-cta-strip"><div><b>Ready to face Aria yourself?</b><p>Live on 29th November 2026 · detailed report · full transcript</p></div><Button onClick={prebook}>Prebook now at just ₹1</Button></div>
      <CourseApproachComparison onPrebook={prebook} />
      <section id="report" className="course-section course-report-band"><div className="course-container"><div className="section-index">02 / YOUR PERFORMANCE</div><div className="course-section-heading"><p className="course-eyebrow">FROM “HOW DID I DO?” TO “WHAT’S NEXT?”</p><h2>See exactly what your<br />AI interview report includes.</h2><p>Explore an illustrative report. Your real report brings together answer analysis, communication, presentation observations, timelines, benchmarks and an improvement plan.</p></div><CourseReportPreview /><Button className="mt-6" onClick={prebook}>Prebook now at just ₹1</Button><div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-muted-foreground"><span>Full transcript · Answer-level evidence · Downloadable PDF</span><span>Private to your student account</span></div></div></section>
      <section className="course-section course-container course-readiness-section"><div className="section-index">03 / YOUR PROGRESS</div><div className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="course-eyebrow">SMALL STEPS. VISIBLE PROGRESS.</p><h2 className="mt-4 text-4xl font-bold leading-tight">Know where you stand.<br /><span className="text-primary">See how far you can go.</span></h2><p className="mt-5 text-lg text-muted-foreground">Your readiness scale uses completed interview scores. Compare your own progress with the available student average, without waiting for a minimum sample size.</p><Button className="mt-6" onClick={prebook}>Prebook now at just ₹1</Button><p className="mt-4 text-sm text-muted-foreground">Practice feedback supports preparation; it is not an admission prediction or guarantee.</p></div><CourseReadinessPreview /></div></section>
      <section className="course-section course-process-band"><div className="course-container"><div className="course-section-heading"><p className="course-eyebrow">YOUR NEXT INTERVIEW STARTS HERE</p><h2>Prepare. Practise. Progress.</h2></div><div className="grid gap-8 md:grid-cols-3">{[["01", "Make it yours", "Create your account, complete your profile and choose your interview practice."], ["02", "Meet Aria", "Book an available slot, check your camera and microphone, then start your conversation."], ["03", "Build on the feedback", "Review your transcript, explore your report and practise the moments that need attention."]].map(([n, title, copy]) => <div className="course-step" key={n}><span>{n}</span><h3 className="mt-5 text-2xl font-bold">{title}</h3><p className="mt-3 text-muted-foreground">{copy}</p></div>)}</div></div></section>
      <section id="plans" className="course-section course-container"><div className="section-index">04 / YOUR NEXT STEP</div><div className="course-section-heading"><p className="course-eyebrow">INVEST IN YOUR NEXT STEP</p><h2>Choose your course.</h2><p>Courses open on 29th November 2026. Reserve your seat for ₹1 today. The student workspace includes the Resume Builder and two free SOP reviews; one SOP review is reserved for NMIMS.</p></div>{data.courses.length > 0 ? <div className="grid gap-5 md:grid-cols-2">{data.courses.map(c => <article className="course-plan" key={c.id}><p className="course-eyebrow">{c.credits ? `${c.credits} interview credit${c.credits === 1 ? "" : "s"}` : "MBA GDPI PREPARATION"}</p><h3 className="mt-4 text-2xl font-bold">{c.name}</h3><p className="mt-5 text-4xl font-bold">₹{Number(c.final_price).toLocaleString("en-IN")}</p>{c.actual_price > c.final_price && <p className="mt-1 text-muted-foreground line-through">₹{Number(c.actual_price).toLocaleString("en-IN")}</p>}<p className="mt-4 text-muted-foreground">{c.description}</p><dl className="mt-5 divide-y border-y">{c.deliverables.map((d, i) => <div className="py-3" key={i}><dt className="font-bold">{d.item}</dt><dd className="mt-1 text-sm text-muted-foreground">{d.detail}</dd></div>)}</dl><Button className="mt-6 w-full" onClick={prebook}>Prebook now at just ₹1</Button></article>)}</div> : <div className="course-launch"><div><span className="course-eyebrow">{data.unavailable ? "COURSE CATALOG TEMPORARILY UNAVAILABLE" : "THE NEXT CHAPTER IS COMING"}</span><h3 className="mt-3 text-3xl font-bold">{data.unavailable ? "Please check back shortly." : "New courses are on their way."}</h3><p className="mt-3 text-muted-foreground">{data.unavailable ? "We couldn’t load the latest offers. Please try again later." : "The MBA Compass workspace opens on 29th November 2026. Course prices and inclusions will appear here when published."}</p></div><Button size="lg" onClick={prebook}>Prebook now at just ₹1</Button></div>}<CourseComparison courses={data.courses} onPrebook={prebook} /><p className="mt-5 text-sm text-muted-foreground">Purchases open with the launch on 29th November 2026. Prebooking reserves an early-bird seat; it does not create an account.</p></section>
      <CourseTestimonials />
      <CourseFAQs />
      <section className="course-final"><div className="course-container"><p className="course-eyebrow">YOUR STORY DESERVES A STRONGER DELIVERY.</p><h2>Show up prepared.<br /><span className="text-primary">Show up as you.</span></h2><div className="mt-7 flex flex-wrap justify-center gap-3"><Button size="lg" onClick={prebook}>Prebook now at just ₹1</Button><Button size="lg" variant="outline" onClick={() => scrollTo("plans")}>View all courses</Button></div></div></section>
    </main><footer className="course-container flex flex-wrap items-center justify-between gap-5 py-7"><FullLogo className="h-12 w-32 object-contain" /><p className="text-sm text-muted-foreground">MBA Compass · By B School Buzz AI</p><div className="flex items-center gap-3"><Button variant="link" asChild><Link to="/privacy">Privacy</Link></Button><Button variant="link" onClick={prebook}>Prebook at ₹1</Button></div></footer>
    <div className="course-mobile-buy"><div><b>Launching 29 Nov 2026</b><span>Limited seats · prebook for ₹1</span></div><Button size="sm" onClick={prebook}>Prebook at ₹1</Button></div>
  </div>;
}