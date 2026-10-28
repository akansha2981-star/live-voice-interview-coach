import { Button } from "@/components/ui/button";

export function scrollToPlans() {
  document.getElementById("plans")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
}

export function BuyMockButton({ label = "Buy AI Mock · ₹99", className, size = "lg" }: { label?: string; className?: string; size?: "sm" | "lg" | "default" }) {
  return <Button size={size} className={`course-buy-btn ${className ?? ""}`} onClick={scrollToPlans}>{label}</Button>;
}
