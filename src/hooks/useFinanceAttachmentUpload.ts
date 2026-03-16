import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFinanceAttachmentUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadAttachment = async (file: File, festivalId: string, voucherNumber?: string | null) => {
    setIsUploading(true);
    try {
      const year = new Date().getFullYear().toString();
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `${festivalId}/${year}/${voucherNumber || "bilag"}/${Date.now()}-${safeName}`;

      const { data, error } = await supabase.storage
        .from("finance-bilag")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from("finance-bilag")
        .getPublicUrl(data.path);

      return {
        url: publicUrl.publicUrl,
        name: file.name,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAttachment, isUploading };
}
