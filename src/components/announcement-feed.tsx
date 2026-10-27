import { useState } from "react";
import type React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { safeUrl } from "@/lib/prep";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Post = { id: string; body: string | null; image_path: string | null; link_url: string | null; created_at: string; image: string | null; likeCount: number; likedByMe: boolean; comments: { id: string; user_id: string; author_name: string; from_staff: boolean; body: string; created_at: string }[] };

export const announcementsKey = ["announcements"] as const;
export function useAnnouncements() {
  return useQuery({ queryKey: announcementsKey, queryFn: async (): Promise<{ me: string | null; posts: Post[] }> => {
    const [{ data: u }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("announcements").select("id, body, image_path, link_url, created_at, announcement_likes(user_id), announcement_comments(id, user_id, author_name, from_staff, body, created_at)").order("created_at", { ascending: false }).limit(50),
    ]);
    if (error) throw error;
    const ids = (data ?? []).map((p) => p.id);
    const { data: counts, error: countError } = ids.length ? await supabase.rpc("announcement_like_counts", { _ids: ids }) : { data: [], error: null };
    if (countError) throw countError;
    const countMap = new Map((counts ?? []).map((c) => [c.announcement_id, Number(c.likes)]));
    const me = u.user?.id ?? null;
    const paths = (data ?? []).map((p) => p.image_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabase.storage.from("resources").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
    return { me, posts: (data ?? []).map((p) => ({ id: p.id, body: p.body, image_path: p.image_path, link_url: p.link_url, created_at: p.created_at, image: p.image_path ? urls.get(p.image_path) ?? null : null, likeCount: countMap.get(p.id) ?? 0, likedByMe: !!me && (p.announcement_likes ?? []).some((l) => l.user_id === me), comments: [...(p.announcement_comments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)) })) };
  } });
}

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "Just now"; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
}

export function AnnouncementCard({ p, me, i = 0, canModerate = false, onDelete }: { p: Post; me: string | null; i?: number; canModerate?: boolean; onDelete?: () => void }) {
  const qc = useQueryClient(); const [text, setText] = useState(""); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const liked = !!me && p.likes.includes(me); const link = safeUrl(p.link_url);
  const refresh = () => qc.invalidateQueries({ queryKey: announcementsKey });
  async function toggleLike() {
    if (!me) return;
    const { error } = liked ? await supabase.from("announcement_likes").delete().eq("announcement_id", p.id).eq("user_id", me) : await supabase.from("announcement_likes").insert({ announcement_id: p.id, user_id: me });
    if (error) toast.error("Could not update like"); refresh();
  }
  async function comment() {
    const body = text.trim(); if (!me || !body) return; if (body.length > 1000) return toast.error("Keep comments under 1000 characters.");
    setBusy(true); const { error } = await supabase.from("announcement_comments").insert({ announcement_id: p.id, user_id: me, body }); setBusy(false);
    if (error) return toast.error("Could not post comment"); setText(""); setOpen(true); refresh();
  }
  async function removeComment(id: string) { const { error } = await supabase.from("announcement_comments").delete().eq("id", id); if (error) toast.error("Could not delete"); refresh(); }
  return <article style={{ "--i": i } as React.CSSProperties} className="animate-reveal section-card overflow-hidden">
    <header className="flex items-center justify-between gap-3 p-4 pb-2">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-sky text-xs font-bold text-primary-foreground">MC</span><div><p className="text-sm font-bold">MBA Compass</p><p className="text-xs text-muted-foreground">Official announcement · {ago(p.created_at)}</p></div></div>
      {canModerate && onDelete && <Button size="sm" variant="ghost" onClick={onDelete}>Delete post</Button>}
    </header>
    {p.body && <p className="whitespace-pre-line px-4 pb-3 text-[15px] leading-relaxed">{p.body}</p>}
    {p.image && (link ? <a href={link} target="_blank" rel="noopener noreferrer"><img src={p.image} alt="" className="max-h-[520px] w-full bg-secondary object-contain" loading="lazy" /></a> : <img src={p.image} alt="" className="max-h-[520px] w-full bg-secondary object-contain" loading="lazy" />)}
    {link && <a href={link} target="_blank" rel="noopener noreferrer" className="mx-4 mt-3 block truncate rounded-lg border bg-secondary/60 px-3 py-2 text-sm font-semibold text-primary hover:border-primary/40">Open link · {new URL(link).hostname}</a>}
    <div className="mx-4 mt-3 flex items-center justify-between border-b pb-2 text-xs text-muted-foreground"><span>{p.likes.length} {p.likes.length === 1 ? "like" : "likes"}</span><button className="hover:text-primary" onClick={() => setOpen((o) => !o)}>{p.comments.length} {p.comments.length === 1 ? "comment" : "comments"}</button></div>
    <div className="grid grid-cols-2 gap-1 px-2 py-1">
      <Button variant="ghost" onClick={toggleLike} className={liked ? "font-bold text-primary" : "text-muted-foreground"}>{liked ? "Liked" : "Like"}</Button>
      <Button variant="ghost" onClick={() => setOpen((o) => !o)} className="text-muted-foreground">Comment</Button>
    </div>
    {open && <div className="grid gap-3 border-t bg-secondary/30 p-4">
      {p.comments.map((c) => <div key={c.id} className="flex items-start gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-[10px] font-bold text-primary ring-1 ring-border">{c.author_name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase()}</span>
        <div className="min-w-0 flex-1"><div className="rounded-2xl bg-card px-3 py-2 ring-1 ring-border"><p className="text-xs font-bold">{c.author_name}{c.from_staff && <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] uppercase text-primary-foreground">Team</span>}</p><p className="whitespace-pre-line break-words text-sm">{c.body}</p></div>
          <p className="mt-0.5 px-2 text-[11px] text-muted-foreground">{ago(c.created_at)}{(c.user_id === me || canModerate) && <button className="ml-2 hover:text-destructive" onClick={() => removeComment(c.id)}>Delete</button>}</p></div></div>)}
      <div className="flex items-end gap-2"><Textarea rows={1} maxLength={1000} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} className="min-h-10 bg-card" /><Button disabled={busy || !text.trim()} onClick={comment}>Post</Button></div>
    </div>}
  </article>;
}
