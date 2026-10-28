import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicCourse = { id: string; name: string; actual_price: number; final_price: number; credits: number; description: string | null; deliverables: { item: string; detail: string }[] };

export const getPublicCourses = createServerFn({ method: "GET" }).handler(async (): Promise<{ courses: PublicCourse[]; unavailable: boolean }> => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { courses: [], unavailable: true };
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.rpc("public_course_catalog");
  if (error) { console.error("Public course catalog unavailable", error.code); return { courses: [], unavailable: true }; }
  return { courses: Array.isArray(data) ? data as unknown as PublicCourse[] : [], unavailable: false };
});