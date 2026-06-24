import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useCallback } from "react";

export interface VerificationRequest {
  id: string;
  user_id: string;
  id_type: 'student_id' | 'aadhaar' | 'pan';
  id_number: string;
  front_image_url: string;
  back_image_url?: string;
  selfie_url: string;
  status: 'pending' | 'verified' | 'rejected';
  admin_note?: string;
  created_at: string;
}

export const useVerification = () => {
  const [loading, setLoading] = useState(false);

  const fetchMyVerificationStatus = useCallback(async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('verification_status, is_verified, full_name, avatar_url')
      .eq('id', userId)
      .limit(1);

    if (error) {
      console.error("Error fetching verification status:", error);
      return null;
    }

    return data?.[0] || null;
  }, []);

  const submitVerification = useCallback(async (userId: string, formData: {
    idType: 'student_id' | 'aadhaar' | 'pan';
    idNumber: string;
    frontImage: File;
    backImage?: File;
    selfie: File;
  }) => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      
      // 1. Upload Images
      const frontPath = `verification-docs/${userId}/front_${timestamp}_${formData.frontImage.name}`;
      const frontUpload = await supabase.storage.from('verification-docs').upload(frontPath, formData.frontImage);
      if (frontUpload.error) throw frontUpload.error;

      let backPath = null;
      if (formData.backImage) {
        backPath = `verification-docs/${userId}/back_${timestamp}_${formData.backImage.name}`;
        const backUpload = await supabase.storage.from('verification-docs').upload(backPath, formData.backImage);
        if (backUpload.error) throw backUpload.error;
      }

      const selfiePath = `verification-docs/${userId}/selfie_${timestamp}_${formData.selfie.name}`;
      const selfieUpload = await supabase.storage.from('verification-docs').upload(selfiePath, formData.selfie);
      if (selfieUpload.error) throw selfieUpload.error;

      // 2. Insert Request Record
      const { error: insertError } = await (supabase as any)
        .from('verification_requests')
        .insert({
          user_id: userId,
          id_type: formData.idType,
          id_number: formData.idNumber,
          front_image_url: frontPath,
          back_image_url: backPath,
          selfie_url: selfiePath,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // 3. Update Profile Status
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success("Verification submitted! We'll review within 24 hours ✅");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to submit verification");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    fetchMyVerificationStatus,
    submitVerification
  };
};
