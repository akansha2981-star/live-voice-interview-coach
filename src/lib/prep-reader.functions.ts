import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { READER_CHUNK_BYTES, READER_MAX_BYTES, READER_MAX_OPENS, READER_OPEN_WINDOW_MS, bytesToBase64, totalFromContentRange, xorBytes } from "@/lib/prep-reader";

/**
 * Streams one masked chunk of a prep-material PDF to the in-dashboard reader.
 * There is no download URL: the file never leaves storage except as XOR-masked
 * chunks to a signed-in, active student who can see the published resource.
 */
export const readPrepChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; offset: number }) => z.object({ id: z.string().uuid(), offset: z.number().int().min(0).max(READER_MAX_BYTES) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("can_view_feed", { _user_id: context.userId });
    if (!allowed) throw new Error("Your account cannot open prep material right now.");
    // RLS: students only see published resources; staff see all.
    const { data: res } = await context.supabase.from("resources").select("id, title, pdf_path").eq("id", data.id).maybeSingle();
    if (!res?.pdf_path) throw new Error("This document is not available.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.offset === 0) {
      const since = new Date(Date.now() - READER_OPEN_WINDOW_MS).toISOString();
      const { count } = await supabaseAdmin.from("resource_downloads").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("downloaded_at", since);
      if ((count ?? 0) >= READER_MAX_OPENS) throw new Error("Too many documents opened in a short time. Please wait a few minutes.");
      await supabaseAdmin.from("resource_downloads").insert({ resource_id: res.id, user_id: context.userId, resource_title: res.title });
    }

    const { data: signed, error } = await supabaseAdmin.storage.from("resources").createSignedUrl(res.pdf_path, 30);
    if (error || !signed) throw new Error("Could not open the document.");
    const end = data.offset + READER_CHUNK_BYTES - 1;
    const r = await fetch(signed.signedUrl, { headers: { Range: `bytes=${data.offset}-${end}` } });
    if (r.status === 416) throw new Error("Document read past its end.");
    if (!r.ok) throw new Error("Could not open the document.");
    let bytes = new Uint8Array(await r.arrayBuffer());
    let total = r.status === 206 ? totalFromContentRange(r.headers.get("content-range")) : bytes.length;
    if (r.status !== 206) bytes = bytes.subarray(data.offset, data.offset + READER_CHUNK_BYTES); // storage ignored the range
    if (!total || total > READER_MAX_BYTES) throw new Error("This document is too large to open.");

    const key = crypto.getRandomValues(new Uint8Array(32));
    const claims = context.claims as { email?: string } | undefined;
    return {
      total,
      offset: data.offset,
      key: bytesToBase64(key),
      chunk: bytesToBase64(xorBytes(bytes, key)),
      viewer: data.offset === 0 ? claims?.email ?? "MBA Compass student" : undefined,
    };
  });
