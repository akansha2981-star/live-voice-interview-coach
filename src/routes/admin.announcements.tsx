import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { AnnouncementCard, announcementsKey, useAnnouncements } from "@/components/announcement-feed";
import { useStaff } from "@/hooks/use-staff";
import { validateUpload } from "@/lib/admin-utils";
import { safeUrl } from "@/lib/prep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/announcements")({ component: AdminAnnouncements });

function AdminAnnouncements() {
  const staff = useStaff(); const qc = useQueryClient(); const { data, isLoading } = useAnnouncements();
  const [body, setBody] = useState(""); const [link, setLink] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [key, setKey] = useState(0);
  async function post() {
    if (!body.trim() && !file) return toast.error("Add text or an image.");
    if (link.trim() && !safeUrl(link)) return toast.error("Enter a full link starting with https://");
    setBusy(true);
    try {
      let image_path: string | null = null;
      if (file) {
        const err = validateUpload(file, 5); if (err) throw new Error(err);
        if (!file.type.startsWith("image/")) throw new Error("Upload a PNG, JPG or WEBP image.");
        image_path = `banners/announcements/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("resources").upload(image_path, file, { contentType: file.type }); if (error) throw error;
      }
      const { error } = await supabase.from("announcements").insert({ body: body.trim() || null, link_url: safeUrl(link), image_path, created_by: staff.id });
      if (error) throw error;
      await supabase.rpc("log_audit", { _action: "announcement_posted", _target: null as unknown as string, _details: { has_image: !!image_path } });
      toast.success("Announcement posted"); setBody(""); setLink(""); setFile(null); setKey((k) => k + 1); qc.invalidateQueries({ queryKey: announcementsKey });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not post"); } finally { setBusy(false); }
  }
  async function remove(id: string, path: string | null) {
    if (!confirm("Delete this announcement with its likes and comments?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) return toast.error(error.message);
    if (path) await supabase.storage.from("resources").remove([path]);
    await supabase.rpc("log_audit", { _action: "announcement_deleted", _target: null as unknown as string, _details: {} });
    qc.invalidateQueries({ queryKey: announcementsKey });
  }
  return <>
    <PageHeader title="Important Announcements" sub="Post text, images and links. Students can like and comment." />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      {staff.canOperate ? <Card title="New post" className="h-fit lg:sticky lg:top-20"><div className="grid gap-3">
        <Textarea rows={5} placeholder="Write the announcement (optional if you add an image)" value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="grid gap-1 text-sm">Image (optional, max 5 MB)<Input key={key} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <Input placeholder="Link (optional) https://…" value={link} onChange={(e) => setLink(e.target.value)} />
        <Button disabled={busy} onClick={post}>{busy ? "Posting…" : "Post announcement"}</Button>
      </div></Card> : <Card><p className="text-sm text-muted-foreground">Your role can view but not post announcements.</p></Card>}
      <div className="grid gap-4">{isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.posts.length ? <Card><p className="text-sm text-muted-foreground">No posts yet.</p></Card> : data.posts.map((p) => <AnnouncementCard key={p.id} p={p} me={data.me} canModerate={staff.canOperate} onDelete={() => remove(p.id, p.image_path)} />)}</div>
    </div>
  </>;
}
