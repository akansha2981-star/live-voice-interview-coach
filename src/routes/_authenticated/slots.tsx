import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Ticket } from "lucide-react";
import { meQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/slots")({
  head: () => ({
    meta: [
      { title: "Interview slots — MBA Compass AI Interview" },
      { name: "description", content: "See your available interview slots and request more." },
      { property: "og:title", content: "Interview slots — MBA Compass" },
      { property: "og:description", content: "Buy more AI mock interview slots." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Slots,
});

// Contact address for purchases — replace with the real MBA Compass address.
const CONTACT_EMAIL = "support@mbacompass.in";

const PACKS = [
  { n: 1, name: "Single slot", perks: ["1 live AI interview", "Full scored report + PDF"] },
  { n: 5, name: "Practice pack", perks: ["5 live AI interviews", "Track progress across attempts", "Most popular"], featured: true },
  { n: 10, name: "Final prep pack", perks: ["10 live AI interviews", "Every interview type & difficulty"] },
];

function Slots() {
  const { data: me } = useSuspenseQuery(meQuery);
  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">Interview slots</h1>
          <p className="mt-1 text-muted-foreground">Each live interview uses one slot.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-3">
          <Ticket className="size-5 text-accent" />
          <span className="text-sm text-muted-foreground">Available</span>
          <span className="font-display text-3xl font-semibold">{me.credits}</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PACKS.map((p, i) => (
          <div
            key={p.n}
            style={{ animationDelay: `${i * 80}ms` }}
            className={`animate-rise rounded-2xl border p-6 ${p.featured ? "bg-gradient-ink text-ink-foreground shadow-soft" : "bg-card"}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${p.featured ? "text-accent" : "text-sky"}`}>{p.name}</p>
            <p className="mt-2 font-display text-5xl font-semibold">
              {p.n}
              <span className="ml-1 text-base font-normal opacity-70">slot{p.n > 1 ? "s" : ""}</span>
            </p>
            <ul className="mt-4 grid gap-2 text-sm">
              {p.perks.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-success" /> {x}
                </li>
              ))}
            </ul>
            <Button asChild className={`mt-6 w-full ${p.featured ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Buy ${p.n} interview slot(s)`)}&body=${encodeURIComponent(
                  `Hi MBA Compass,\n\nI'd like to buy ${p.n} AI interview slot(s).\nAccount email: ${me.profile?.email ?? ""}\n`,
                )}`}
              >
                Buy {p.n} slot{p.n > 1 ? "s" : ""}
              </a>
            </Button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Slots are added to your account by the MBA Compass team after purchase.
      </p>
    </div>
  );
}
