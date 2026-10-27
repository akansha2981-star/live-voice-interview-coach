import { createFileRoute } from "@tanstack/react-router";
import { FinanceWorkspace } from "@/components/admin/finance-workspace";
export const Route=createFileRoute("/admin/finance")({ staticData: { sitemap: false },
  head:()=>({meta:[{title:"Finance & costing — MBA Compass"},{name:"description",content:"Admin finance, AI usage and expense reports for MBA Compass."},{property:"og:title",content:"MBA Compass finance & costing"},{property:"og:description",content:"Business expenses and evidence-based product costing."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"},{name:"robots",content:"noindex"}]}),
  component:FinanceWorkspace,
});