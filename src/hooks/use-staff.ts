import { getRouteApi } from "@tanstack/react-router";
import { staffAccess } from "@/lib/admin-utils";

const adminRoute = getRouteApi("/admin");
/** Current staff member and their permissions inside the /admin portal. */
export function useStaff() {
  const { staff } = adminRoute.useRouteContext();
  return { ...staff!, ...staffAccess(staff?.roles ?? []) };
}
