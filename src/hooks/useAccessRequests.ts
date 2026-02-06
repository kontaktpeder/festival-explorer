import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AccessRequest, AccessRequestStatus } from "@/types/access-request";

export function useAccessRequests() {
  return useQuery({
    queryKey: ["access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as AccessRequest[];
    },
  });
}

export function useAccessRequest(id: string) {
  return useQuery({
    queryKey: ["access-request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as AccessRequest | null;
    },
    enabled: !!id,
  });
}

export function useCreateAccessRequest() {
  return useMutation({
    mutationFn: async (request: {
      name: string;
      email: string;
      role_type: string;
      message?: string | null;
    }) => {
      const verificationToken = crypto.randomUUID();

      const insertPayload = {
        ...request,
        verification_token: verificationToken,
        verification_sent_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("access_requests")
        .insert([insertPayload]);

      if (error) throw error;
      return { ...insertPayload, id: "", created_at: new Date().toISOString(), status: "new", reviewed_at: null, reviewed_by: null, admin_notes: null, email_verified: false, verification_sent_at: insertPayload.verification_sent_at ?? null } as AccessRequest;
    },
  });
}

export function useVerifyAccessEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.functions.invoke(
        "verify-access-email",
        { body: { token } }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Verifisering feilet");
      return data as { success: true; name: string };
    },
  });
}

export function useUpdateAccessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_notes,
    }: {
      id: string;
      status?: AccessRequestStatus;
      admin_notes?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = {};
      if (status) {
        updateData.status = status;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
      }
      if (admin_notes !== undefined) {
        updateData.admin_notes = admin_notes;
      }

      const { data, error } = await supabase
        .from("access_requests")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AccessRequest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["access-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["access-request", variables.id],
      });
    },
  });
}
