import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export function useDocumentPreview(bucket: "resume-analyses" | "sop-reviews", path: string | null | undefined) {
  return useQuery({ queryKey:["private-document-preview",bucket,path], enabled:Boolean(path), staleTime:180000, refetchInterval:180000, queryFn:async () => {
    if (!path) return null;
    const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,300);
    if(error) return null;
    return data.signedUrl;
  }}).data;
}