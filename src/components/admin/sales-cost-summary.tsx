import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getFinance } from "@/lib/finance.functions";
import { financeAccess, money, summarizeFinance, PRODUCTS } from "@/lib/finance";
import { useStaff } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
export function SalesCostSummary({from,to}:{from:string;to:string}) {
  const staff=useStaff(); const access=financeAccess(staff.roles??[]);const load=useServerFn(getFinance);
  const {data,error}=useQuery({queryKey:["admin","finance",from,to],enabled:access.read,queryFn:()=>load({data:{from,to}})});
  if(!access.read)return null;
  return <section className="min-w-0 border-y py-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">AI product costs · INR</h2><Button asChild size="sm" variant="outline"><Link to="/admin/finance">Finance & costing</Link></Button></div>{error?<p className="text-sm text-destructive">Cost summaries unavailable.</p>:<div className="grid gap-4 sm:grid-cols-3">{(["interview","resume","sop"] as const).map(product=>{const t=summarizeFinance(data?.usage.filter(u=>u.product===product)??[],data?.expenses.filter(e=>e.product===product)??[],"INR");return <div key={product} className="min-w-0 border-l-2 border-primary/30 pl-3"><h3 className="text-sm font-semibold">{PRODUCTS[product]}</h3><p className="mt-1 text-sm">Billed: {money(t.billed,"INR")}</p><p className="text-xs text-muted-foreground">Pending estimate: {money(t.estimated,"INR")}</p></div>;})}</div>}<p className="mt-3 text-xs text-muted-foreground">Costs without verified records remain unavailable; profit is not inferred from incomplete coverage.</p></section>;
}