import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { fmtDateTime, TICKET_CATEGORIES, TICKET_STATUS } from "@/lib/admin-utils";
import { SupportThread, uploadSupportFiles } from "@/components/support-thread";
import { StatusPill } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Help & Support — MBA Compass AI Interview" }, { name: "description", content: "Raise a support ticket and track replies from the MBA Compass team." }, { property: "og:title", content: "Help & Support — MBA Compass" }, { property: "og:description", content: "Get help with bookings, credits, interviews and reports." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: SupportPage,
});

function SupportPage() {
  const { data: me } = useSuspenseQuery(meQuery); const qc = useQueryClient();
  const [cat, setCat] = useState(TICKET_CATEGORIES[0]); const [subject, setSubject] = useState(""); const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]); const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ["tickets"], queryFn: async () => { const { data, error } = await supabase.from("support_tickets").select("*").eq("user_id", me.id).order("updated_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  async function submit() {
    if (subject.trim().length < 3 || body.trim().length < 5) return toast.error("Add a subject and describe the issue.");
    setBusy(true);
    try {
      const attachments = await uploadSupportFiles(me.id, files);
      const { data: t, error } = await supabase.from("support_tickets").insert({ user_id: me.id, category: cat, subject: subject.trim() }).select("id, ticket_no").single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("ticket_messages").insert({ ticket_id: t.id, author_id: me.id, body: body.trim(), attachments });
      if (e2) throw e2;
      toast.success(`Ticket #${t.ticket_no} created`); setSubject(""); setBody(""); setFiles([]); setOpen(t.id);
      qc.invalidateQueries({ queryKey: ["tickets"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create ticket"); } finally { setBusy(false); }
  }
  async function reopen(id: string) { const { error } = await supabase.rpc("reopen_ticket", { _ticket_id: id }); if (error) return toast.error(error.message); qc.invalidateQueries({ queryKey: ["tickets"] }); }
  const ticket = tickets.find((t) => t.id === open);
  return <div className="grid gap-6">
    <section className="animate-reveal section-card p-6"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Help & Support</p><h1 className="mt-1 text-3xl font-bold">How can we help?</h1><p className="mt-1 text-sm text-muted-foreground">Raise a ticket and our team will reply here.</p></section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="animate-reveal section-card grid content-start gap-3 p-5">
        <h2 className="text-lg font-bold">New ticket</h2>
        <label className="grid gap-1 text-sm">Category<select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border bg-card px-2">{TICKET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Subject<Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></label>
        <label className="grid gap-1 text-sm">Describe the issue<Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} /></label>
        <label className="grid gap-1 text-sm">Screenshots or documents (PNG, JPG, WEBP, PDF · max 10 MB, up to 5)<Input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label>
        <Button disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit ticket"}</Button>
      </section>
      <section className="animate-reveal section-card p-5">
        <h2 className="mb-3 text-lg font-bold">My tickets</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : tickets.length === 0 ? <p className="text-sm text-muted-foreground">You have no tickets yet.</p> :
          <ul className="grid gap-2">{tickets.map((t) => <li key={t.id}><button onClick={() => setOpen(open === t.id ? null : t.id)} className={`card-lift w-full rounded-lg border p-3 text-left ${open === t.id ? "border-primary bg-secondary/50" : ""}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">#{t.ticket_no} · {t.subject}</span><StatusPill s={TICKET_STATUS[t.status]} /></div><p className="mt-1 text-xs text-muted-foreground">{t.category} · updated {fmtDateTime(t.updated_at)}</p></button></li>)}</ul>}
        {ticket && <div className="mt-4 border-t pt-4">
          <SupportThread ticketId={ticket.id} userId={me.id} staff={false} canReply closed={ticket.status === "closed" || ticket.status === "resolved"} />
          {ticket.status === "resolved" && <Button variant="outline" className="mt-3" onClick={() => reopen(ticket.id)}>Reopen ticket</Button>}
        </div>}
      </section>
    </div>
  </div>;
}
