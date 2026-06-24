import { supabase } from "@/lib/supabase";
import { getSignedUrl } from "@/utils/storage";
import { useEffect, useState, useCallback } from "react";

export interface JobFile {
  id: string;
  job_id: string;
  uploader_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  is_submission: boolean;
  is_watermarked: boolean;
  created_at: string;
  downloadUrl?: string;
}

/**
 * Fetches job files for a job.
 * - Brief files (is_submission=false) are ALWAYS visible to everyone.
 * - Submission files (is_submission=true) are only shown to authorized job
 *   participants, and downloadUrls are only populated when job is 'completed'.
 */
export const useJobFiles = (jobId: string, isAuthorized: boolean, jobStatus?: string) => {
  const [files, setFiles] = useState<JobFile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    if (!jobId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("job_files")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const withUrls: JobFile[] = await Promise.all(
        (data as JobFile[]).map(async (f) => {
          // Submission files: only show to authorized participants
          if (f.is_submission) {
            if (!isAuthorized) return null as any; // filter out below
            // Download URL only available when job is completed
            if (jobStatus !== "completed") return { ...f, downloadUrl: undefined };
            try {
              const downloadUrl = await getSignedUrl("job-files", f.file_url);
              return { ...f, downloadUrl };
            } catch {
              return { ...f, downloadUrl: undefined };
            }
          }

          // Brief files: visible to EVERYONE — generate signed URL or public URL
          try {
            const downloadUrl = await getSignedUrl("job-files", f.file_url);
            return { ...f, downloadUrl };
          } catch {
            const { data: publicData } = supabase.storage.from("job-files").getPublicUrl(f.file_url);
            return { ...f, downloadUrl: publicData.publicUrl };
          }
        })
      );

      // Filter out null entries (hidden submission files for unauthorized users)
      setFiles(withUrls.filter(Boolean));
    } catch (err) {
      console.error("useJobFiles error:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, isAuthorized, jobStatus]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, refresh: fetchFiles };
};
