import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function ValidatorPage() {
  const { ticketCode } = useParams<{ ticketCode: string }>();
  const navigate = useNavigate();
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkStaff = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffRole } = await supabase
          .from("staff_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        setIsStaff(!!staffRole);
      } else {
        setIsStaff(false);
      }
    };
    checkStaff();
  }, []);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["validate-ticket", ticketCode],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/validate-ticket?code=${ticketCode}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to validate ticket");
      }
      return response.json();
    },
    enabled: !!ticketCode && isStaff === true,
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `https://nxgotyhhjtwikdcjdxxn.supabase.co/functions/v1/checkin-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ ticketCode, method: "qr" }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to check in");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Billett sjekket inn!");
      queryClient.invalidateQueries({ queryKey: ["validate-ticket", ticketCode] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isStaff === null) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold">Logg inn for å validere</h2>
            <p className="text-muted-foreground">Du må ha crew- eller admin-tilgang for å validere billetter.</p>
            <Button onClick={() => navigate("/admin/login")}>
              <LogIn className="mr-2 w-4 h-4" /> Logg inn
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>;
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <XCircle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Billett ikke funnet</h2>
            <p className="text-muted-foreground">{(error as Error)?.message || "Kunne ikke hente billett"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    VALID: "bg-green-500",
    USED: "bg-destructive",
    CANCELLED: "bg-muted",
  };

  const StatusIcon = ticket.status === "VALID" ? CheckCircle : ticket.status === "USED" ? XCircle : AlertCircle;

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="max-w-sm w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle>{ticket.eventName}</CardTitle>
          <p className="text-muted-foreground">{ticket.ticketType}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-1">
            <p className="font-mono text-xl">{ticket.ticketCode}</p>
            <p className="font-medium">{ticket.buyerName}</p>
            <p className="text-sm text-muted-foreground">{ticket.buyerEmail}</p>
          </div>

          <div className="flex justify-center">
            <Badge className={`${statusColors[ticket.status]} text-white text-lg px-4 py-2`}>
              <StatusIcon className="w-5 h-5 mr-2" />
              {ticket.status}
            </Badge>
          </div>

          {ticket.checkedInAt && (
            <p className="text-center text-sm text-muted-foreground">
              Sjekket inn: {new Date(ticket.checkedInAt).toLocaleString("no-NO")}
            </p>
          )}

          <Button
            onClick={() => checkInMutation.mutate()}
            disabled={ticket.status !== "VALID" || checkInMutation.isPending}
            className="w-full"
            size="lg"
          >
            {checkInMutation.isPending ? (
              <><Loader2 className="animate-spin mr-2" />Sjekker inn...</>
            ) : (
              <><CheckCircle className="mr-2" />Check in</>
            )}
          </Button>

          {ticket.status !== "VALID" && (
            <p className="text-center text-sm text-destructive">
              {ticket.status === "USED" ? "Denne billetten er allerede brukt" : "Denne billetten er kansellert"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
