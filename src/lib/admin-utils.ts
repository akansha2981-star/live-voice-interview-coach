// Browser-safe admin helpers.
export const STAFF_ROLES = ["admin", "operations_admin", "support_agent", "analyst"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const ROLE_LABEL: Record<StaffRole, string> = { admin: "Super Admin", operations_admin: "Operations Admin", support_agent: "Support Agent", analyst: "Read-only Analyst" };

export function staffAccess(roles: string[]) {
  const has = (r: StaffRole) => roles.includes(r);
  return {
    isStaff: STAFF_ROLES.some(has),
    isSuper: has("admin"),
    canOperate: has("admin") || has("operations_admin"),
    canSupport: has("admin") || has("operations_admin") || has("support_agent"),
  };
}

function cell(v: unknown) {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // prevent spreadsheet formula injection
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n");
}
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(["\ufeff" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(a.href);
}

export function dailyAverage(total: number, days: number) {
  return days > 0 ? Math.round((total / days) * 10) / 10 : 0;
}

export const TICKET_CATEGORIES = ["Course purchase", "Account and login", "Interview booking", "Interview credits", "Camera or microphone issues", "AI interview problems", "Interview report", "SOP and resource downloads", "Technical issue", "Other"];
export const TICKET_STATUS: Record<string, string> = { open: "Open", in_progress: "In Progress", waiting_student: "Waiting for Student", resolved: "Resolved", closed: "Closed" };
export const ALLOWED_UPLOAD = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export function validateUpload(f: File, maxMb = 10) {
  if (!ALLOWED_UPLOAD.includes(f.type)) return "Only PNG, JPG, WEBP or PDF files are allowed.";
  if (f.size > maxMb * 1024 * 1024) return `Files must be under ${maxMb} MB.`;
  return null;
}
export function fmtDateTime(d: string | null | undefined) {
  return d ? new Date(d).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}
