import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublishSlots } from "@/components/publish-slots";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — MBA Compass AI Interview" },
      { name: "description", content: "Manage students and interview credits." },
      { property: "og:title", content: "Admin workspace — MBA Compass" },
      { property: "og:description", content: "Student and credit management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: AdminPage,
});

function AdminPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: students = [] } = useQuery({
    queryKey: ["admin", "students"],
    enabled: me.isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: ledger }, { data: interviews }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, target_role, created_at").order("created_at", { ascending: false }),
        supabase.from("credit_ledger").select("user_id, delta"),
        supabase
          .from("interviews")
          .select("id, user_id, status, overall_score, started_at")
          .order("started_at", { ascending: false }),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        credits: (ledger ?? []).filter((l) => l.user_id === p.id).reduce((s, l) => s + l.delta, 0),
        interviews: (interviews ?? []).filter((i) => i.user_id === p.id),
      }));
    },
  });

  if (!me.isAdmin) return <p className="text-muted-foreground">You don't have access to this page.</p>;

  async function grant(userId: string, delta: number) {
    const { error } = await supabase.from("credit_ledger").insert({
      user_id: userId,
      delta,
      reason: delta > 0 ? "Granted by admin" : "Removed by admin",
      created_by: me.id,
    });
    if (error) return toast.error(error.message);
    toast.success(delta > 0 ? "Credit added" : "Credit removed");
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  const filtered = students.filter((s) =>
    `${s.email ?? ""} ${s.full_name ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grid gap-6">
      <PublishSlots userId={me.id} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Students</h1>
          <p className="text-muted-foreground">Grant interview credits and review reports.</p>
        </div>
        <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4">Student</th>
              <th className="p-4">Target role</th>
              <th className="p-4">Credits</th>
              <th className="p-4">Interviews</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="p-4">
                  <p className="font-medium">{s.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </td>
                <td className="p-4">{s.target_role || "—"}</td>
                <td className="p-4 font-display text-xl">{s.credits}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {s.interviews.length === 0 && <span className="text-muted-foreground">None</span>}
                    {s.interviews.slice(0, 5).map((i) => (
                      <Link
                        key={i.id}
                        to="/report/$id"
                        params={{ id: i.id }}
                        className="rounded-md bg-muted px-2 py-1 text-xs hover:bg-secondary"
                      >
                        {new Date(i.started_at).toLocaleDateString()} · {i.overall_score ?? i.status}
                      </Link>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={s.credits < 1} onClick={() => grant(s.id, -1)}>
                      −1
                    </Button>
                    <Button size="sm" onClick={() => grant(s.id, 1)}>
                      +1 credit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
