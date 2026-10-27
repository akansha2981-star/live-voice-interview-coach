import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMAIL_PLACEHOLDERS, fillPlaceholders } from "@/lib/email-content";

export const Route = createFileRoute("/admin/emails")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Email notifications — MBA Compass Admin" }, { name: "description", content: "Edit the subject and content of student email alerts." }, { property: "og:title", content: "Email notifications — MBA Compass" }, { property: "og:description", content: "Manage automated student email alerts." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: EmailsPage,
});

type Tpl = { key: string; name: string; subject: string; heading: string; body: string; button_label: string; enabled: boolean; updated_at: string };

const SAMPLE: Record<string, string> = { name: "Asha", slot_time: "27 Oct 2026, 4:30 pm", college_line: " for IIM Ahmedabad", score: "78", interview_date: "27 Oct 2026, 4:30 pm", file_name: "Asha_Resume.pdf", ats_score: "81", course: "GDPI Pro Pack", amount: "₹999.00", credits: "10", order_id: "order_ABC123" };

function EmailsPage() {
  const staff = useStaff();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin", "email-templates"], queryFn: async () => { const { data, error } = await supabase.from("email_templates").select("*").order("key"); if (error) throw error; return data as Tpl[]; } });
  const [openKey, setOpenKey] = useState<string | null>(null);
  return <>
    <PageHeader title="Email notifications" sub="Automated emails sent from no-reply@notify.mbacompass.online. Edit wording, turn alerts on or off." />
    <Card title={`Email alerts (${data.length})`}>
      <div className="divide-y">{data.map((t) => <div key={t.key} className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">{t.name}{!t.enabled && <span className="ml-2 text-xs text-muted-foreground">Off</span>}</p><p className="mt-1 text-xs text-muted-foreground">{t.subject}</p></div>
          <Button size="sm" variant="secondary" onClick={() => setOpenKey(openKey === t.key ? null : t.key)}>{openKey === t.key ? "Close" : staff.canOperate ? "Edit" : "View"}</Button>
        </div>
        {openKey === t.key && <Editor tpl={t} canEdit={staff.canOperate} onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "email-templates"] })} />}
      </div>)}</div>
    </Card>
  </>;
}

function Editor({ tpl, canEdit, onSaved }: { tpl: Tpl; canEdit: boolean; onSaved: () => void }) {
  const [f, setF] = useState(tpl);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Tpl) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.subject.trim() || !f.heading.trim() || !f.body.trim()) return toast.error("Subject, heading and message are required.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("email_templates").update({ subject: f.subject.trim(), heading: f.heading.trim(), body: f.body.trim(), button_label: f.button_label.trim(), enabled: f.enabled, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null }).eq("key", tpl.key);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Email saved."); onSaved();
  }
  const ph = EMAIL_PLACEHOLDERS[tpl.key] ?? [];
  return <div className="mt-4 grid gap-5 lg:grid-cols-2">
    <div className="grid gap-3">
      <div className="grid gap-2"><Label htmlFor={`s-${tpl.key}`}>Subject</Label><Input id={`s-${tpl.key}`} value={f.subject} onChange={set("subject")} maxLength={200} disabled={!canEdit} /></div>
      <div className="grid gap-2"><Label htmlFor={`h-${tpl.key}`}>Heading</Label><Input id={`h-${tpl.key}`} value={f.heading} onChange={set("heading")} maxLength={200} disabled={!canEdit} /></div>
      <div className="grid gap-2"><Label htmlFor={`b-${tpl.key}`}>Message (blank line = new paragraph)</Label><Textarea id={`b-${tpl.key}`} rows={9} value={f.body} onChange={set("body")} maxLength={4000} disabled={!canEdit} /></div>
      <div className="grid gap-2"><Label htmlFor={`l-${tpl.key}`}>Button text (leave empty for no button)</Label><Input id={`l-${tpl.key}`} value={f.button_label} onChange={set("button_label")} maxLength={60} disabled={!canEdit} /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} disabled={!canEdit} /> Send this email</label>
      <p className="text-xs text-muted-foreground">Available fields: {ph.map((p) => `{{${p}}}`).join("  ")}</p>
      {canEdit && <div><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save email"}</Button></div>}
    </div>
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Preview with sample details</p>
      <p className="mt-3 text-sm"><span className="text-muted-foreground">Subject: </span>{fillPlaceholders(f.subject, SAMPLE)}</p>
      <p className="mt-5 text-xs font-bold tracking-[0.3em] text-primary">MBA COMPASS</p>
      <h3 className="mt-3 text-lg font-bold">{fillPlaceholders(f.heading, SAMPLE)}</h3>
      {fillPlaceholders(f.body, SAMPLE).split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i} className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{p}</p>)}
      {f.button_label && <span className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{f.button_label}</span>}
    </div>
  </div>;
}
