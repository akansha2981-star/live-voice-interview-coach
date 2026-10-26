import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { fmtDateTime, validateUpload } from "@/lib/admin-utils";

type Attachment = { path: string; name: string; type: string };

export async function uploadSupportFiles(userId: string, files: File[]): Promise<Attachment[]> {
  const out: Attachment[] = [];
  for (const f of files.slice(0, 5)) {
    const err = validateUpload(f, 10); if (err) throw new Error(`${f.name}: ${err}`);
    const path = `${userId}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("support").upload(path, f, { contentType: f.type });
    if (error) throw error;
    out.push({ path, name: f.name, type: f.type });
  }
  return out;
}

async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from("support").createSignedUrl(path, 120);
  if (error || !data) return toast.error("You cannot open this attachment.");
  window.open(data.signedUrl, "_blank", "noopener");
}

/** Conversation view shared by students and staff. Staff see internal notes; students never receive them (RLS). */
export function SupportThread({ ticketId, userId, staff, canReply, closed }: { ticketId: string; userId: string; staff: boolean; canReply: boolean; closed: boolean }) {
  const qc = useQueryClient();
  const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]); const [internal, setInternal] = useState(false); const [busy, setBusy] = useState(false);
  const { data: msgs = [] } = useQuery({ queryKey: ["ticket", ticketId], queryFn: async () => { const { data, error } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at"); if (error) throw error; return data ?? []; }, refetchInterval: 20000 });
  async function send() {
    if (!body.trim()) return toast.error("Write a message.");
    setBusy(true);
    try {
      const attachments = await uploadSupportFiles(userId, files);
      const { error } = await supabase.from("ticket_messages").insert({ ticket_id: ticketId, author_id: userId, body: body.trim(), internal: staff && internal, from_staff: staff, attachments });
      if (error) throw error;
      setBody(""); setFiles([]); setInternal(false);
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] }); qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["admin", "tickets"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not send"); } finally { setBusy(false); }
  }
  return <div className="grid gap-3">
    <ol className="grid max-h-[45dvh] gap-3 overflow-y-auto pr-1">
      {msgs.map((m) => <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.internal ? "border-dashed border-accent bg-accent/10" : m.from_staff ? "bg-secondary/60" : "bg-card"}`}>
        <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">{m.internal ? "Internal note" : m.from_staff ? "MBA Compass support" : "Student"}</span><span>{fmtDateTime(m.created_at)}</span></div>
        <p className="whitespace-pre-wrap">{m.body}</p>
        {(m.attachments as Attachment[]).length > 0 && <div className="mt-2 flex flex-wrap gap-2">{(m.attachments as Attachment[]).map((a) => <button key={a.path} onClick={() => openAttachment(a.path)} className="rounded border bg-card px-2 py-1 text-xs text-primary hover:bg-secondary">{a.name}</button>)}</div>}
      </li>)}
    </ol>
    {canReply && !closed && <div className="grid gap-2 rounded-lg border p-3">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" maxLength={5000} />
      <div className="flex flex-wrap items-center justify-between gap-2"><Input type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" className="max-w-xs" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        <div className="flex items-center gap-3">{staff && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note (staff only)</label>}<Button disabled={busy} onClick={send}>{busy ? "Sending…" : internal ? "Add note" : "Send reply"}</Button></div></div>
    </div>}
  </div>;
}
