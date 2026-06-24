import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const useStorage = () => {
  const uploadFile = async (bucket: string, path: string, file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        return null;
      }

      return data;
    } catch (error: any) {
      toast.error(`Storage error: ${error.message}`);
      return null;
    }
  };

  const getSignedUrl = async (bucket: string, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour

      if (error) {
        toast.error(`Failed to get preview: ${error.message}`);
        return null;
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error('getSignedUrl error:', error);
      return null;
    }
  };

  const deleteFile = async (bucket: string, path: string) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        toast.error(`Delete failed: ${error.message}`);
        return false;
      }

      return true;
    } catch (error: any) {
      toast.error(`Storage error: ${error.message}`);
      return false;
    }
  };

  return { uploadFile, getSignedUrl, deleteFile };
};
