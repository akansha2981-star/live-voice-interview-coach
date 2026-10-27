import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validQuestionBudget } from "@/lib/interview-limits";

export const Route = createFileRoute("/admin/colleges")({ staticData: { sitemap: false }, head: () => ({ meta: [{title:"College interview configuration — MBA Compass Admin"},{name:"description",content:"Configure college interview durations, question budgets and answer windows."},{property:"og:title",content:"College interview configuration — MBA Compass"},{property:"og:description",content:"College-specific interview configuration for authorized staff."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}), component: CollegesPage });

function CollegesPage() {
  const staff = useStaff();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [duration, setDuration] = useState(20);
  const [count, setCount] = useState(9);
  const [minSeconds, setMinSeconds] = useState(30);
  const [maxSeconds, setMaxSeconds] = useState(120);
  const { data = [] } = useQuery({ queryKey: ["admin", "colleges"], queryFn: async () => { const { data, error } = await supabase.from("colleges").select("*").order("name"); if (error) throw error; return data; } });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin", "colleges"] }), qc.invalidateQueries({ queryKey: ["colleges"] })]);
  async function add() {
    const n = name.trim(); if (!n) return;
    if (!validQuestionBudget(duration,count,minSeconds,maxSeconds)) return toast.error("Check your answer time range and allow all minimum answers plus 15 seconds for closing within the interview duration.");
    const { error } = await supabase.rpc("admin_save_college_limits", { _id: editing, _name: n, _duration: duration, _count: count, _min: minSeconds, _max: maxSeconds } as never);
    if (error) return toast.error(error.message.includes("duplicate") ? "That college is already listed." : error.message);
    setName(""); setEditing(null); toast.success("College configuration saved."); await refresh();
  }
  async function toggle(id: string, active: boolean) { const { error } = await supabase.from("colleges").update({ active }).eq("id", id); if (error) return toast.error(error.message); await refresh(); }
  async function remove(id: string) { const { error } = await supabase.from("colleges").delete().eq("id", id); if (error) return toast.error("This college is used by bookings; hide it instead."); await refresh(); }
  return <>
    <PageHeader title="Colleges" sub="Colleges students can choose before starting an interview." />
    {staff.canOperate && <Card title={editing ? "Edit college configuration" : "Add college"}><form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void add(); }}><div className="grid gap-2"><Label htmlFor="college-name">College name</Label><Input id="college-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IIM Ahmedabad" maxLength={120} required /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{label:"Interview duration (minutes)",value:duration,set:setDuration,min:5,max:60},{label:"Main question target",value:count,set:setCount,min:3,max:30},{label:"Minimum answer target (seconds)",value:minSeconds,set:setMinSeconds,min:10,max:300},{label:"Maximum answer target (seconds)",value:maxSeconds,set:setMaxSeconds,min:20,max:600}].map((f,i) => <div key={f.label} className="grid gap-2"><Label htmlFor={`limit-${i}`}>{f.label}</Label><Input id={`limit-${i}`} type="number" min={f.min} max={f.max} value={f.value} onChange={(e) => f.set(Number(e.target.value))} required /></div>)}</div><p className="text-xs text-muted-foreground">Duration is a hard cutoff. Question count and answer windows guide Aria; exact spoken-question enforcement is not yet available with the current voice service.</p><div className="flex gap-2"><Button type="submit">{editing ? "Save configuration" : "Add college"}</Button>{editing && <Button variant="outline" onClick={() => {setEditing(null);setName("");}}>Cancel</Button>}</div></form></Card>}
    <Card title={`All colleges (${data.length})`}>
      {!data.length ? <p className="py-6 text-center text-sm text-muted-foreground">No colleges yet.</p> : <div className="divide-y">{data.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{c.name}{!c.active && <span className="ml-2 text-xs text-muted-foreground">Hidden</span>}</p><p className="mt-1 text-xs text-muted-foreground">{c.duration_minutes} minutes · {c.question_count} main-question target · {c.question_min_seconds}–{c.question_max_seconds}s per-answer target</p></div>{staff.canOperate && <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => {setEditing(c.id);setName(c.name);setDuration(c.duration_minutes);setCount(c.question_count);setMinSeconds(c.question_min_seconds);setMaxSeconds(c.question_max_seconds);}}>Configure</Button><Button size="sm" variant="outline" onClick={() => toggle(c.id, !c.active)}>{c.active ? "Hide" : "Show"}</Button><Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Delete</Button></div>}</div>)}</div>}
    </Card>
  </>;
}
