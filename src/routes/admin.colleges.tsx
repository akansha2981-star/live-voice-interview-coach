import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/colleges")({ component: CollegesPage });

function CollegesPage() {
  const staff = useStaff();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data = [] } = useQuery({ queryKey: ["admin", "colleges"], queryFn: async () => { const { data, error } = await supabase.from("colleges").select("*").order("name"); if (error) throw error; return data; } });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin", "colleges"] }), qc.invalidateQueries({ queryKey: ["colleges"] })]);
  async function add() {
    const n = name.trim(); if (!n) return;
    const { error } = await supabase.from("colleges").insert({ name: n });
    if (error) return toast.error(error.message.includes("duplicate") ? "That college is already listed." : error.message);
    setName(""); await refresh();
  }
  async function toggle(id: string, active: boolean) { const { error } = await supabase.from("colleges").update({ active }).eq("id", id); if (error) return toast.error(error.message); await refresh(); }
  async function remove(id: string) { const { error } = await supabase.from("colleges").delete().eq("id", id); if (error) return toast.error("This college is used by bookings; hide it instead."); await refresh(); }
  return <>
    <PageHeader title="Colleges" sub="Colleges students can choose before starting an interview." />
    {staff.canOperate && <Card title="Add college"><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IIM Ahmedabad" maxLength={120} /><Button type="submit">Add</Button></form></Card>}
    <Card title={`All colleges (${data.length})`}>
      {!data.length ? <p className="py-6 text-center text-sm text-muted-foreground">No colleges yet.</p> : <div className="divide-y">{data.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="font-semibold">{c.name}{!c.active && <span className="ml-2 text-xs text-muted-foreground">Hidden</span>}</span>{staff.canOperate && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => toggle(c.id, !c.active)}>{c.active ? "Hide" : "Show"}</Button><Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button></div>}</div>)}</div>}
    </Card>
  </>;
}
