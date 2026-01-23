import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

interface DeletionRequest {
  id: string;
  entity_type: "entity" | "event" | "persona";
  entity_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "completed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  entity_name?: string;
  requester_email?: string;
}

export default function AdminDeletionRequests() {
  const queryClient = useQueryClient();
  const [confirmApprove, setConfirmApprove] = useState<DeletionRequest | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["deletion-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deletion_requests")
        .select(`*`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch entity names and requester info
      const enriched = await Promise.all(
        (data || []).map(async (req) => {
          let entityName = "Ukjent";
          let requesterEmail = "Ukjent";

          try {
            // Get requester email from profiles
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, handle")
              .eq("id", req.requested_by)
              .single();
            requesterEmail = profile?.display_name || profile?.handle || "Ukjent";

            // Get entity name
            if (req.entity_type === "entity") {
              const { data: entity } = await supabase
                .from("entities")
                .select("name")
                .eq("id", req.entity_id)
                .single();
              entityName = entity?.name || "Slettet";
            } else if (req.entity_type === "event") {
              const { data: event } = await supabase
                .from("events")
                .select("title")
                .eq("id", req.entity_id)
                .single();
              entityName = event?.title || "Slettet";
            } else if (req.entity_type === "persona") {
              const { data: persona } = await supabase
                .from("personas")
                .select("name")
                .eq("id", req.entity_id)
                .single();
              entityName = persona?.name || "Slettet";
            }
          } catch {
            // Entity already deleted
          }

          return {
            ...req,
            entity_name: entityName,
            requester_email: requesterEmail,
          };
        })
      );

      return enriched as DeletionRequest[];
    },
  });

  const approveRequest = useMutation({
    mutationFn: async (request: DeletionRequest) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      // Delete the entity first
      if (request.entity_type === "entity") {
        // Delete related data first
        await supabase.from("entity_team").delete().eq("entity_id", request.entity_id);
        await supabase.from("entity_timeline_events").delete().eq("entity_id", request.entity_id);
        await supabase.from("entity_persona_bindings").delete().eq("entity_id", request.entity_id);
        await supabase.from("event_entities").delete().eq("entity_id", request.entity_id);
        
        const { error } = await supabase.from("entities").delete().eq("id", request.entity_id);
        if (error) throw error;
      } else if (request.entity_type === "event") {
        await supabase.from("event_entities").delete().eq("event_id", request.entity_id);
        await supabase.from("event_projects").delete().eq("event_id", request.entity_id);
        await supabase.from("festival_events").delete().eq("event_id", request.entity_id);
        
        const { error } = await supabase.from("events").delete().eq("id", request.entity_id);
        if (error) throw error;
      } else if (request.entity_type === "persona") {
        await supabase.from("entity_persona_bindings").delete().eq("persona_id", request.entity_id);
        await supabase.from("persona_timeline_events").delete().eq("persona_id", request.entity_id);
        
        const { error } = await supabase.from("personas").delete().eq("id", request.entity_id);
        if (error) throw error;
      }

      // Mark request as completed
      const { error: updateError } = await supabase
        .from("deletion_requests")
        .update({
          status: "completed",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      return request;
    },
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-entities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      setConfirmApprove(null);
      
      const typeLabel = request.entity_type === "entity" ? "Prosjekt" : 
                        request.entity_type === "event" ? "Event" : "Profil";
      toast.success(`${typeLabel} slettet`);
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke slette: " + error.message);
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      const { error } = await supabase
        .from("deletion_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deletion-requests"] });
      toast.success("Forespørsel avvist");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke avvise: " + error.message);
    },
  });

  const getEntityLink = (req: DeletionRequest) => {
    if (req.entity_type === "entity") {
      return `/admin/entities/${req.entity_id}`;
    } else if (req.entity_type === "event") {
      return `/admin/events/${req.entity_id}`;
    }
    return null;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "entity": return "Prosjekt";
      case "event": return "Event";
      case "persona": return "Profil";
      default: return type;
    }
  };

  if (isLoading) return <LoadingState message="Laster forespørsler..." />;

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const otherRequests = requests?.filter((r) => r.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-foreground">
        Slettingsforespørsler
      </h1>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-500" />
              Ventende ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{req.entity_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getTypeLabel(req.entity_type)} • Forespurt av: {req.requester_email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleString("no-NO")}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Venter
                  </Badge>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {getEntityLink(req) && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={getEntityLink(req)!}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Se
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmApprove(req)}
                    disabled={approveRequest.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Godkjenn og slett
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rejectRequest.mutate(req.id)}
                    disabled={rejectRequest.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Avvis
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other requests */}
      {otherRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tidligere forespørsler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherRequests.map((req) => (
              <div key={req.id} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{req.entity_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTypeLabel(req.entity_type)} • {req.requester_email}
                  </p>
                </div>
                <Badge 
                  variant={req.status === "completed" ? "default" : "secondary"}
                  className={req.status === "rejected" ? "bg-destructive/10 text-destructive" : ""}
                >
                  {req.status === "completed" ? "Slettet" : req.status === "rejected" ? "Avvist" : req.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {requests?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen slettingsforespørsler
          </CardContent>
        </Card>
      )}

      {/* Confirm approve dialog */}
      <AlertDialog open={!!confirmApprove} onOpenChange={(open) => !open && setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekreft sletting</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette "{confirmApprove?.entity_name}"?
              <br /><br />
              Dette vil permanent slette {confirmApprove?.entity_type === "entity" ? "prosjektet" : 
                confirmApprove?.entity_type === "event" ? "eventet" : "profilen"} og all tilknyttet data.
              <br /><br />
              <strong>Handlingen kan ikke angres.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmApprove && approveRequest.mutate(confirmApprove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
