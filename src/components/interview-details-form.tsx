import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { InterviewDetails } from "@/lib/booking";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DetailsState = InterviewDetails;

export function InterviewDetailsForm({ userId, value, onChange }: { userId: string; value: DetailsState; onChange: (v: DetailsState) => void }) {
  const { data: colleges = [] } = useQuery({ queryKey: ["colleges"], queryFn: async () => { const { data, error } = await supabase.from("colleges").select("id, name").eq("active", true).order("name"); if (error) throw error; return data; } });
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const set = (patch: Partial<DetailsState>) => onChange({ ...value, ...patch });
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File must be under 10 MB.");
    setUploading(true);
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("call-letters").upload(path, file, { contentType: file.type || undefined });
    setUploading(false);
    if (error) return toast.error(error.message);
    setFileName(file.name); set({ callLetterPath: path });
  }
  const disabled = value.practiceOnly;
  return <section className="grid gap-4 rounded-lg border bg-card p-5">
    <div><h2 className="text-lg font-bold">Interview details</h2><p className="mt-1 text-sm text-muted-foreground">Tell us which interview you are preparing for.</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="grid gap-2"><Label>Which college interview are you taking?</Label>
        <Select disabled={disabled} value={value.collegeId ?? ""} onValueChange={(v) => set({ collegeId: v })}><SelectTrigger><SelectValue placeholder={colleges.length ? "Select college" : "No colleges listed yet"} /></SelectTrigger><SelectContent>{colleges.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="grid gap-2"><Label htmlFor="actual-at">Date and time of actual interview</Label><Input id="actual-at" type="datetime-local" disabled={disabled} value={value.actualInterviewAt ?? ""} onChange={(e) => set({ actualInterviewAt: e.target.value || null })} /></div>
      <div className="grid gap-2"><Label htmlFor="call-letter">Upload interview call letter</Label><Input id="call-letter" type="file" accept="image/*,.pdf,.doc,.docx" disabled={disabled || uploading} onChange={(e) => void upload(e.target.files?.[0])} /><p className="text-xs text-muted-foreground">{uploading ? "Uploading…" : fileName ? `Uploaded: ${fileName}` : value.callLetterPath ? "Call letter already uploaded" : "Image, PDF or Word, up to 10 MB"}</p></div>
    </div>
    <label className="flex items-center gap-3 text-sm"><Checkbox checked={value.practiceOnly} onCheckedChange={(v) => set({ practiceOnly: v === true })} /><span>I just want to practice (no college, date or call letter needed)</span></label>
  </section>;
}
