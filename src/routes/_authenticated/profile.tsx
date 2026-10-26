import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { parseResume } from "@/lib/interview.functions";
import { INTERVIEW_CATEGORIES, isProfileReady } from "@/lib/interview-prompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — MBA Compass AI Interview" },
      { name: "description", content: "Tell the interviewer about your background and goals." },
      { property: "og:title", content: "Your profile — MBA Compass AI Interview" },
      { property: "og:description", content: "Professional profile for tailored interviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: ProfilePage,
});

type Form = Record<string, string | boolean>;

const textFields: Array<{ key: string; label: string; area?: boolean; required?: boolean; placeholder?: string }> = [
  { key: "full_name", label: "Full name", required: true },
  { key: "phone", label: "Mobile number" },
  { key: "education", label: "Educational qualifications", area: true, required: true, placeholder: "B.Com, Delhi University (2022)…" },
  { key: "graduation_year", label: "Graduation year" },
  { key: "employment_status", label: "Current employment status", required: true, placeholder: "Working full-time / Student / Between jobs" },
  { key: "work_experience", label: "Work experience", area: true, placeholder: "2 years at Deloitte as Analyst…" },
  { key: "job_title", label: "Current role" },
  { key: "industry", label: "Industry" },
  { key: "target_role", label: "Target role", required: true },
  { key: "target_company", label: "Target companies or industry" },
  { key: "technical_skills", label: "Technical skills", area: true },
  { key: "functional_skills", label: "Functional skills", area: true },
  { key: "projects", label: "Major projects & internships", area: true },
  { key: "achievements", label: "Achievements", area: true },
  { key: "career_objectives", label: "Career objectives", area: true, required: true },
  { key: "linkedin_url", label: "LinkedIn or portfolio URL (optional)" },
  { key: "concerns", label: "Anything you're worried about? (optional)", area: true },
  { key: "accessibility", label: "Accessibility preferences (optional)", area: true },
];

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const parse = useServerFn(parseResume);
  const p = (me.profile ?? {}) as Record<string, unknown>;
  const [form, setForm] = useState<Form>(() => {
    const f: Form = {};
    for (const { key } of textFields) f[key] = p[key] == null ? "" : String(p[key]);
    f.interview_category = String(p.interview_category ?? "general_mba");
    f.difficulty = String(p.difficulty ?? "medium");
    f.interview_language = String(p.interview_language ?? "English");
    f.use_resume = p.use_resume !== false;
    f.use_concerns = p.use_concerns === true;
    return f;
  });
  const [resumeSummary, setResumeSummary] = useState(String(p.resume_summary ?? ""));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function onResume(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isDocx = file.name.toLowerCase().endsWith(".docx");
    if (!isPdf && !isDocx) return toast.error("Please upload a PDF or DOCX file.");
    if (file.size > 10 * 1024 * 1024) return toast.error("Resume must be under 10 MB.");
    setUploading(true);
    try {
      let text: string | null = null;
      if (isDocx) {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.slice(0, 60000);
        if (!text.trim()) throw new Error("We couldn't read text from this document.");
      }
      const path = `${me.id}/resume-${Date.now()}.${isPdf ? "pdf" : "docx"}`;
      const { error } = await supabase.storage.from("resumes").upload(path, file, { contentType: file.type || undefined });
      if (error) throw error;
      const extracted = await parse({ data: { path, text } });
      setResumeSummary(extracted.summary);
      setForm((f) => {
        const next = { ...f };
        for (const [k, v] of Object.entries(extracted)) {
          if (k !== "summary" && v != null && !String(next[k] ?? "").trim()) next[k] = String(v);
        }
        return next;
      });
      toast.success("Resume read. Review the filled-in details below.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const year = parseInt(String(form.graduation_year), 10);
    const payload = {
      ...Object.fromEntries(textFields.map(({ key }) => [key, String(form[key] ?? "").trim() || null])),
      graduation_year: Number.isFinite(year) ? year : null,
      interview_category: String(form.interview_category),
      difficulty: String(form.difficulty),
      interview_language: String(form.interview_language),
      use_resume: Boolean(form.use_resume),
      use_concerns: Boolean(form.use_concerns),
      resume_summary: resumeSummary.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", me.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    toast.success("Profile saved");
    if (isProfileReady(payload)) navigate({ to: "/dashboard" });
    else toast.message("Fill in the required fields (*) to unlock your interview.");
  }

  return (
    <form onSubmit={save} className="mx-auto grid max-w-3xl gap-8">
      <div>
        <h1 className="text-4xl font-semibold">Your professional profile</h1>
        <p className="mt-1 text-muted-foreground">Aria uses this to ask questions that fit you. You decide what's shared.</p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Resume</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload a PDF or DOCX. We'll pre-fill empty fields for you to review.</p>
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm hover:bg-muted">
                    {uploading ? "Reading your resume…" : p.resume_path ? "Replace resume" : "Choose resume file"}
          <input
            type="file"
            accept=".pdf,.docx,application/pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && onResume(e.target.files[0])}
          />
        </label>
        {resumeSummary && (
          <div className="mt-4 grid gap-1.5">
            <Label>Resume summary (editable)</Label>
            <Textarea rows={4} value={resumeSummary} onChange={(e) => setResumeSummary(e.target.value)} />
          </div>
        )}
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="text-xl font-semibold sm:col-span-2">Interview preferences</h2>
        <div className="grid gap-1.5">
          <Label>Interview type *</Label>
          <Select value={String(form.interview_category)} onValueChange={(v) => set("interview_category", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INTERVIEW_CATEGORIES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Difficulty</Label>
          <Select value={String(form.difficulty)} onValueChange={(v) => set("difficulty", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Interview language</Label>
          <Select value={String(form.interview_language)} onValueChange={(v) => set("interview_language", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["English", "Hindi", "Hinglish"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="text-xl font-semibold sm:col-span-2">About you</h2>
        {textFields.map((f) => (
          <div key={f.key} className={`grid gap-1.5 ${f.area ? "sm:col-span-2" : ""}`}>
            <Label htmlFor={f.key}>
              {f.label}
              {f.required ? " *" : ""}
            </Label>
            {f.area ? (
              <Textarea
                id={f.key}
                rows={3}
                placeholder={f.placeholder}
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <Input
                id={f.key}
                placeholder={f.placeholder}
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">What the interviewer may use</h2>
        <label className="flex items-center justify-between gap-4 text-sm">
          Use my resume details for questions
          <Switch checked={Boolean(form.use_resume)} onCheckedChange={(v) => set("use_resume", v)} />
        </label>
        <label className="flex items-center justify-between gap-4 text-sm">
          Let the interviewer know my concerns
          <Switch checked={Boolean(form.use_concerns)} onCheckedChange={(v) => set("use_concerns", v)} />
        </label>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
