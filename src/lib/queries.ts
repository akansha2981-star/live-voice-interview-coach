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
      .select("id, status, category, difficulty, started_at, duration_s, overall_score, vision_summary")
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
    const [slots, { data: bookings, error: bookingError }] = await Promise.all([
      allAvailableSlots(),
      supabase.from("interview_bookings").select("*, interview_slots(*)").eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    if (bookingError) throw bookingError;
    return { slots: slots ?? [], bookings: bookings ?? [] };
  },
  refetchInterval: 30000,
});

async function allAvailableSlots() {
  const pageSize = 500;
  const slots: import("@/integrations/supabase/types").Database["public"]["Functions"]["interview_slot_availability"]["Returns"] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.rpc("interview_slot_availability").order("starts_at").order("id").range(offset, offset + pageSize - 1);
    if (error) throw error;
    slots.push(...(data ?? []));
    if (!data || data.length < pageSize) return slots;
  }
}

/** Completed reports (no transcripts) for the dashboard insights. */
export const myReportsQuery = queryOptions({
  queryKey: ["interviews", "reports"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase
      .from("interviews")
      .select("id, started_at, category, overall_score, report, vision_summary, speech_metrics")
      .eq("user_id", id)
      .eq("status", "completed")
      .order("started_at", { ascending: true })
      .limit(50);
    if (error) throw error;
    return data;
  },
});

export const myReviewsQuery = queryOptions({
  queryKey: ["answer_reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("answer_reviews").select("interview_id, question_index, reviewed_at");
    if (error) throw error;
    return data;
  },
});

export const benchmarkQuery = (category: string | null) =>
  queryOptions({
    queryKey: ["benchmark", category],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("score_benchmark", { _category: category ?? "" });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
