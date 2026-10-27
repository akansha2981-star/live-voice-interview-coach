import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, DataTable, PageHeader, SearchBox, Select } from "@/components/admin/admin-ui";
import { peopleQuery } from "@/lib/admin-queries";
import { fmtDateTime } from "@/lib/admin-utils";
import { openUserDocument } from "@/lib/admin.functions";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/documents")({ staticData: { sitemap: false }, component: DocumentsPage });

type Doc = { id: string; bucket: "resumes" | "support"; path: string; name: string; category: string; owner: string; uploaded: string | null; related: string; type: string; access: string };

function DocumentsPage() {
  const staff = useStaff(); const open = useServerFn(openUserDocument);
  const { data: people } = useQuery(peopleQuery);
  const [q, setQ] = useState(""); const [cat, setCat] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["admin", "documents"], queryFn: async () => {
    const [{ data: profiles }, { data: msgs }, { data: tickets }] = await Promise.all([
      supabase.from("profiles").select("id, resume_path, updated_at").not("resume_path", "is", null),
      supabase.from("ticket_messages").select("id, ticket_id, author_id, attachments, created_at").neq("attachments", "[]").limit(2000),
      supabase.from("support_tickets").select("id, ticket_no, user_id"),
    ]);
    const tk = new Map((tickets ?? []).map((t) => [t.id, t]));
    const docs: Doc[] = (profiles ?? []).map((p) => ({ id: `r-${p.id}`, bucket: "resumes", path: p.resume_path!, name: p.resume_path!.split("/").pop() ?? "resume", category: "Resume", owner: p.id, uploaded: p.updated_at, related: "Profile", type: p.resume_path!.split(".").pop()?.toUpperCase() ?? "—", access: "Owner, operations staff" }));
    for (const m of msgs ?? []) for (const a of m.attachments as { path: string; name: string; type: string }[]) { const t = tk.get(m.ticket_id); docs.push({ id: `s-${a.path}`, bucket: "support", path: a.path, name: a.name, category: "Support attachment", owner: t?.user_id ?? m.author_id, uploaded: m.created_at, related: t ? `Ticket #${t.ticket_no}` : "Ticket", type: a.type.split("/").pop()?.toUpperCase() ?? "—", access: "Ticket owner, support staff" }); }
    return docs;
  } });
  const rows = data.map((d) => ({ ...d, ownerName: people?.get(d.owner)?.full_name ?? "", ownerEmail: people?.get(d.owner)?.email ?? "" })).filter((d) => (!cat || d.category === cat) && `${d.name} ${d.ownerName} ${d.ownerEmail} ${d.related}`.toLowerCase().includes(q.toLowerCase()));
  async function view(d: Doc) {
    try { const { url } = await open({ data: { bucket: d.bucket, path: d.path, owner: d.owner } }); window.open(url, "_blank", "noopener"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Cannot open document"); }
  }
  return <>
    <PageHeader title="User Documents" sub="Private files uploaded by users. Opening a document is recorded in the audit log." />
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3"><SearchBox value={q} onChange={setQ} placeholder="Search file, owner or ticket" /><Select label="Category" value={cat} onChange={setCat} options={[["", "All"], ["Resume", "Resumes"], ["Support attachment", "Support attachments"]]} /></div>
      <DataTable loading={isLoading} rows={rows} empty="No user documents found." cols={[
        { key: "name", label: "Document", render: (d) => <span className="font-semibold">{d.name}</span> }, { key: "category", label: "Category" },
        { key: "o", label: "Owner", render: (d) => <div><p>{d.ownerName || "—"}</p><p className="text-xs text-muted-foreground">{d.ownerEmail}</p></div> },
        { key: "uploaded", label: "Uploaded", render: (d) => fmtDateTime(d.uploaded) }, { key: "related", label: "Related to" }, { key: "type", label: "Type" }, { key: "access", label: "Access" },
        { key: "a", label: "", render: (d) => (d.bucket === "resumes" ? staff.canOperate : staff.isStaff) ? <Button size="sm" variant="outline" onClick={() => view(d)}>Open</Button> : <span className="text-xs text-muted-foreground">No permission</span> },
      ]} />
    </Card>
  </>;
}
