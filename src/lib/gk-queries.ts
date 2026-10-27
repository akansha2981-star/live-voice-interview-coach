import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GkAngle, GkFact, GkQuestion, GkWord } from "./gk";

export type GkCategory = { id: string; name: string; slug: string; description: string | null; mark: string | null; color: string | null; display_order: number; is_active: boolean };
export type GkArticle = {
  id: string; title: string; slug: string; category_id: string | null; subcategory: string | null; cover_image: string | null;
  summary_english: string | null; summary_hindi: string | null; summary_hinglish: string | null; detailed_content: string | null; why_this_matters: string | null;
  facts: GkFact[]; interview_angles: GkAngle[]; interview_questions: GkQuestion[]; vocabulary: GkWord[];
  author: string | null; tags: string[] | null; article_date: string | null; status: "draft" | "published" | "scheduled"; scheduled_at: string | null; published_at: string | null; created_at: string;
};
export type GkProgress = { article_id: string; is_read: boolean; is_saved: boolean };

export const gkKeys = { cats: ["gk", "cats"] as const, articles: ["gk", "articles"] as const, progress: ["gk", "progress"] as const };

export function useGkCategories() {
  return useQuery({ queryKey: gkKeys.cats, queryFn: async () => {
    const { data, error } = await supabase.from("gk_categories").select("*").order("display_order");
    if (error) throw error; return (data ?? []) as GkCategory[];
  } });
}
export function useGkArticles() {
  return useQuery({ queryKey: gkKeys.articles, queryFn: async () => {
    const { data, error } = await supabase.from("gk_articles").select("*").order("published_at", { ascending: false, nullsFirst: false }).limit(500);
    if (error) throw error; return (data ?? []) as unknown as GkArticle[];
  } });
}
export function useGkProgress() {
  return useQuery({ queryKey: gkKeys.progress, queryFn: async () => {
    const { data: s } = await supabase.auth.getSession(); const uid = s.session?.user.id; if (!uid) return [] as GkProgress[];
    const { data, error } = await supabase.from("gk_user_progress").select("article_id,is_read,is_saved").eq("user_id", uid);
    if (error) throw error; return (data ?? []) as GkProgress[];
  } });
}

export function useGkProgressMutation() {
  const qc = useQueryClient();
  return async (articleId: string, patch: { is_read?: boolean; is_saved?: boolean }) => {
    const { data: s } = await supabase.auth.getSession(); const uid = s.session?.user.id; if (!uid) throw new Error("Please sign in again.");
    const now = new Date().toISOString();
    const row = { ...patch, ...(patch.is_read !== undefined ? { read_at: patch.is_read ? now : null } : {}), ...(patch.is_saved !== undefined ? { saved_at: patch.is_saved ? now : null } : {}), updated_at: now };
    const { data: existing } = await supabase.from("gk_user_progress").select("id").eq("user_id", uid).eq("article_id", articleId).maybeSingle();
    const { error } = existing
      ? await supabase.from("gk_user_progress").update(row).eq("id", existing.id)
      : await supabase.from("gk_user_progress").insert({ user_id: uid, article_id: articleId, ...row });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: gkKeys.progress });
  };
}

export async function recordGkView(articleId: string) {
  const { data: s } = await supabase.auth.getSession(); const uid = s.session?.user.id; if (!uid) return;
  await supabase.from("gk_article_views").insert({ user_id: uid, article_id: articleId });
}
