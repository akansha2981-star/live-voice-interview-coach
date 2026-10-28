import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { comparisonRows, coursePurchaseDestination } from "@/lib/course-comparison";
import type { PublicCourse } from "@/lib/public-courses.functions";

export function CoursePurchaseLink({ signedIn, className = "" }: { signedIn: boolean; className?: string }) {
  const destination = coursePurchaseDestination(signedIn);
  return <Button asChild className={className}>{destination === "/slots" ? <Link to="/slots">Choose this course</Link> : <Link to="/auth" search={{ redirect: "/slots" }}>Sign in to buy</Link>}</Button>;
}

export function CourseComparison({ courses, signedIn }: { courses: PublicCourse[]; signedIn: boolean }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const selected = courses.filter(c => !excluded.includes(c.id));
  const rows = comparisonRows(selected).filter(row => !differencesOnly || new Set(row.values).size > 1);
  return <div className="course-comparison"><div className="flex flex-wrap justify-between gap-4"><div><p className="course-eyebrow">SIDE BY SIDE. NOTHING HIDDEN.</p><h3 className="mt-2 text-2xl font-bold">Find the right fit.</h3></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={differencesOnly} onChange={e => setDifferencesOnly(e.target.checked)} />Only show different deliverables</label></div>
    {courses.length === 0 ? <p className="mt-5 text-muted-foreground">Compare prices, interview credits and included deliverables here as soon as courses go live.</p> : <><div className="my-5 flex flex-wrap gap-4">{courses.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!excluded.includes(c.id)} onChange={e => setExcluded(prev => e.target.checked ? prev.filter(id => id !== c.id) : [...prev, c.id])} />{c.name}</label>)}</div>{selected.length > 0 ? <div className="course-comparison-scroll" tabIndex={0} role="region" aria-label="Course comparison table"><table><caption className="sr-only">Published course prices, interview credits and deliverables</caption><thead><tr><th scope="col">Your course</th>{selected.map(c => <th scope="col" key={c.id}>{c.name}</th>)}</tr></thead><tbody><tr><th scope="row">Current price</th>{selected.map(c => <td key={c.id} className="font-bold text-primary">₹{Number(c.final_price).toLocaleString("en-IN")}</td>)}</tr><tr><th scope="row">Interview credits</th>{selected.map(c => <td key={c.id}>{c.credits}</td>)}</tr>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{row.values.map((value, i) => <td key={i}>{value}</td>)}</tr>)}<tr><th scope="row">Enrolment</th>{selected.map(c => <td key={c.id}><CoursePurchaseLink signedIn={signedIn} /></td>)}</tr></tbody></table></div> : <p className="py-6 text-muted-foreground">Select a course above to compare.</p>}<p className="mt-4 text-xs text-muted-foreground">“Not listed” means that inclusion has not been specified in the published course details.</p></>}
  </div>;
}

const reviewSlots = [
  ["The interview experience", "A student’s first-hand experience of practising with Aria will appear here."],
  ["From feedback to progress", "A student’s experience of using their report to improve will appear here."],
  ["Preparing a stronger story", "A student’s experience of resume and SOP preparation will appear here."],
];
export function CourseTestimonials() {
  const [paused, setPaused] = useState(false);
  return <section className="course-testimonial-section" aria-label="Student testimonials"><div className="course-container"><div className="flex flex-wrap items-end justify-between gap-4"><div className="course-section-heading mb-0"><p className="course-eyebrow">THE NEXT VOICES YOU’LL HEAR</p><h2>Student stories.<br />Real preparation journeys.</h2><p>Student testimonials are coming soon. These are placeholders, not reviews or endorsements.</p></div><Button variant="outline" onClick={() => setPaused(v => !v)} aria-pressed={paused}>{paused ? "Resume scrolling" : "Pause scrolling"}</Button></div></div><div className={`course-testimonial-window ${paused ? "is-paused" : ""}`}><div className="course-testimonial-track">{[0, 1].map(copy => <div className="course-testimonial-set" key={copy} aria-hidden={copy === 1 ? true : undefined}>{reviewSlots.map(([title, text], i) => <article className="course-review" key={title}><div className="flex items-center justify-between gap-3"><span className="course-review-number">0{i + 1}</span><span className="text-xs text-muted-foreground">Awaiting student testimonial</span></div><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-4 text-muted-foreground">{text}</p><p className="mt-6 border-t pt-4 text-xs font-bold text-primary">MBA Compass · Student stories</p></article>)}</div>)}</div></div></section>;
}

const faqGroups = ["All questions", "Interviews", "Courses & payment", "Reports & privacy"];
const faqs = [
  ["Interviews", "Is this a live conversation or a recorded lesson?", "The mock interview is a live voice conversation with an AI interviewer. Questions and follow-ups respond to your answers."],
  ["Interviews", "What do I need for my interview?", "A reliable internet connection, a working camera and microphone, and a quiet place. The app checks your equipment before the interview starts."],
  ["Interviews", "Can I practise for a specific college?", "Select from the colleges available in your booking form. Interview settings and preparation context depend on the college configuration published by MBA Compass."],
  ["Courses & payment", "Do I need an account to buy a course?", "Yes. You can explore and compare courses without logging in, but you must sign in or create a student account before buying. Purchases and credits are linked to that account."],
  ["Courses & payment", "Will new courses appear on this page?", "Yes. When MBA Compass publishes a course as live, its current price, interview credits and deliverables appear in the course list and comparison here. Draft and disabled courses are not shown."],
  ["Courses & payment", "Does every course include resume and SOP reviews?", "Inclusions vary. Consult your selected course’s published deliverables and credit requirements. A feature available in the workspace is not automatically included in every course."],
  ["Courses & payment", "Where do I buy after signing in?", "You’ll continue to the Interview slots page, where published courses are available in the Buy interview credits section. Review your course and price before opening payment."],
  ["Reports & privacy", "Will I receive a detailed report?", "Completed interviews have a report with answer feedback, transcript, measured delivery information and a practice plan. You can download the report as a PDF."],
  ["Reports & privacy", "Is my camera video stored?", "Camera analysis runs in your browser. Only aggregated observations are stored, not webcam video. Camera observations do not determine your overall ability score."],
  ["Reports & privacy", "Are the report previews real student results?", "No. The previews on this public page use illustrative sample scores and answers. Your private dashboard and report use your actual completed interviews."],
  ["Reports & privacy", "Does a readiness score guarantee admission?", "No. Readiness scores support your preparation and track practice performance; they are not admission predictions or guarantees."],
];
export function CourseFAQs() {
  const [group, setGroup] = useState("All questions");
  return <section id="faqs" className="course-section course-container border-t"><div className="grid gap-10 md:grid-cols-[.65fr_1.35fr]"><div><p className="course-eyebrow">GOOD QUESTIONS. CLEAR ANSWERS.</p><h2 className="mt-4 text-4xl font-bold">Everything you<br />want to know.</h2><p className="mt-5 text-muted-foreground">From your first interview to choosing the right course.</p><Button variant="link" asChild className="mt-4 px-0"><Link to="/privacy">Read our privacy policy</Link></Button></div><div><div className="mb-4 flex flex-wrap gap-2" aria-label="FAQ categories">{faqGroups.map(g => <Button size="sm" key={g} variant={g === group ? "secondary" : "ghost"} aria-pressed={g === group} onClick={() => setGroup(g)}>{g}</Button>)}</div>{faqs.filter(([g]) => group === "All questions" || g === group).map(([g, q, a], i) => <details className="course-faq" key={q} name="course-faqs"><summary><span className="course-faq-number">{String(i + 1).padStart(2, "0")}</span><span>{q}</span><span className="course-faq-state">Read</span></summary><p>{a}</p><small className="text-primary">{g}</small></details>)}</div></div></section>;
}