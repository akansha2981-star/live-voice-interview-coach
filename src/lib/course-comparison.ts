import type { PublicCourse } from "@/lib/public-courses.functions";

export function comparisonRows(courses: PublicCourse[]) {
  const labels = [...new Set(courses.flatMap(c => c.deliverables.map(d => d.item.trim()).filter(Boolean)))];
  return labels.map(label => ({ label, values: courses.map(c => c.deliverables.filter(d => d.item.trim() === label).map(d => d.detail).join(" · ") || "Not listed") }));
}

export function coursePurchaseDestination(signedIn: boolean) {
  return signedIn ? "/slots" : "/auth";
}