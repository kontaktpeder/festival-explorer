import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UserContactInfo } from "@/types/contact";

export function useContactInfo() {
  return useQuery({
    queryKey: ["user-contact-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_contact_info")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserContactInfo | null;
    },
  });
}

export function useUpsertContactInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (info: {
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      use_as_default: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      const payload = {
        user_id: user.id,
        ...info,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_contact_info")
        .upsert(payload as never, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      return data as UserContactInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-contact-info"] });
    },
  });
}
