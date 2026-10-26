import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Lightweight directory of users for name lookups in admin tables. */
export const peopleQuery = queryOptions({
  queryKey: ["admin", "people"],
  queryFn: async () => {
    const out: { id: string; full_name: string | null; email: string | null; phone: string | null }[] = [];
    for (let o = 0; ; o += 1000) {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email, phone").order("created_at").range(o, o + 999);
      if (error) throw error;
      out.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return new Map(out.map((p) => [p.id, p]));
  },
  staleTime: 60000,
});

export async function balances(userIds: string[]) {
  if (!userIds.length) return new Map<string, number>();
  const { data } = await supabase.from("credit_ledger").select("user_id, delta").in("user_id", userIds);
  const m = new Map<string, number>();
  for (const r of data ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + r.delta);
  return m;
}
