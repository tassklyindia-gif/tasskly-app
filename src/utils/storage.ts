import { supabase } from "@/lib/supabase";

/**
 * Returns a signed URL valid for 1 hour for a private bucket object.
 */
export async function getSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl ?? "";
}
