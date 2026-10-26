import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const id = await uid();
    const [{ data: profile }, { data: roles }, { data: balance }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.rpc("credit_balance", { _user_id: id }),
    ]);
    return {
      id,
      profile,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      credits: (balance as number | null) ?? 0,
    };
  },
});

export const myInterviewsQuery = queryOptions({
  queryKey: ["interviews", "mine"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase
      .from("interviews")
      .select("id, status, category, difficulty, started_at, duration_s, overall_score")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
});

export const interviewQuery = (id: string) =>
  queryOptions({
    queryKey: ["interview", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("interviews").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const bookingQuery = queryOptions({
  queryKey: ["bookings"],
  queryFn: async () => {
    const id = await uid();
    const [{ data: slots, error: slotError }, { data: bookings, error: bookingError }] = await Promise.all([
      supabase.rpc("interview_slot_availability"),
      supabase.from("interview_bookings").select("*, interview_slots(*)").eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    if (slotError) throw slotError;
    if (bookingError) throw bookingError;
    return { slots: slots ?? [], bookings: bookings ?? [] };
  },
  refetchInterval: 30000,
});
