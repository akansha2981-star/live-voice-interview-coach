import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Authenticated, tracked resource download: logs the event and returns a short-lived signed URL. */
export const downloadResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    // Staff only: students read prep material inside the secure dashboard reader and never get a file.
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Documents can only be read inside the dashboard.");
    const { data: res } = await context.supabase.from("resources").select("id, title, pdf_path").eq("id", data.id).maybeSingle();
    if (!res?.pdf_path) throw new Error("This resource has no PDF yet.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("resource_downloads").insert({ resource_id: res.id, user_id: context.userId, resource_title: res.title });
    const { data: signed, error } = await supabaseAdmin.storage.from("resources").createSignedUrl(res.pdf_path, 120, { download: `${res.title}.pdf` });
    if (error || !signed) throw new Error("Could not prepare the download.");
    return { url: signed.signedUrl };
  });

/** Staff-only document access with audit logging. */
export const openUserDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { bucket: string; path: string; owner: string | null }) =>
    z.object({ bucket: z.enum(["resumes", "support"]), path: z.string().min(1).max(400), owner: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Not allowed");
    const { data: signed, error } = await context.supabase.storage.from(data.bucket).createSignedUrl(data.path, 120);
    if (error || !signed) throw new Error("You do not have permission to open this document.");
    await context.supabase.rpc("log_audit", { _action: "document_access", _target: data.owner as string, _details: { bucket: data.bucket, path: data.path } });
    return { url: signed.signedUrl };
  });
