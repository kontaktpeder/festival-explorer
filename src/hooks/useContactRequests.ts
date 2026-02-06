import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContactRequest, ContactMode } from "@/types/contact";

export function useContactRequests(filters?: {
  mode?: ContactMode;
  search?: string;
}) {
  return useQuery({
    queryKey: ["contact-requests", filters],
    queryFn: async () => {
      let query = supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.mode) {
        query = query.eq("mode", filters.mode);
      }

      if (filters?.search) {
        const s = `%${filters.search}%`;
        query = query.or(
          `recipient_name.ilike.${s},sender_email.ilike.${s},sender_name.ilike.${s},subject.ilike.${s}`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data || []) as ContactRequest[];
    },
  });
}

export function useContactRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["contact-request", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ContactRequest;
    },
    enabled: !!id,
  });
}

export function useCreateContactRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<ContactRequest, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("contact_requests")
        .insert(request as never)
        .select()
        .single();

      if (error) throw error;
      return data as ContactRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-requests"] });
    },
  });
}
