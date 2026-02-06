import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContactRequest } from "@/hooks/useContactRequests";
import { getRequestTypeLabel } from "@/types/contact";
import { LoadingState } from "@/components/ui/LoadingState";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, Mail, User, Clock } from "lucide-react";

export default function AdminInboxDetail() {
  const { id } = useParams();
  const { data: request, isLoading } = useContactRequest(id);

  if (isLoading) return <LoadingState />;

  if (!request) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Forespørselen ble ikke funnet</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/inbox">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake
          </Link>
        </Button>
      </div>
    );
  }

  const payload = request.template_payload;

  return (
    <div className="max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/inbox">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til inbox
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{request.mode === "template" ? "Mal" : "Fritekst"}</Badge>
          {payload?.request_type && (
            <Badge variant="secondary">{getRequestTypeLabel(payload.request_type)}</Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {format(new Date(request.created_at), "d. MMMM yyyy, HH:mm", { locale: nb })}
          </Badge>
        </div>

        {request.subject && (
          <h1 className="text-xl font-bold tracking-tight">{request.subject}</h1>
        )}
      </div>

      {/* Sender & Recipient */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-border/30 bg-card/50 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" /> Avsender
          </p>
          <p className="font-medium">{request.sender_name}</p>
          <p className="text-sm text-muted-foreground">{request.sender_email}</p>
          {request.sender_phone && (
            <p className="text-sm text-muted-foreground">{request.sender_phone}</p>
          )}
        </div>
        <div className="p-4 rounded-lg border border-border/30 bg-card/50 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3 w-3" /> Mottaker
          </p>
          <p className="font-medium">{request.recipient_name}</p>
          <p className="text-sm text-muted-foreground">{request.recipient_email}</p>
        </div>
      </div>

      {/* Template payload */}
      {payload && (
        <div className="p-4 rounded-lg border border-border/30 bg-card/50 space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Mal-detaljer</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2">{getRequestTypeLabel(payload.request_type)}</span>
            </div>
            {payload.date_or_timeframe && (
              <div>
                <span className="text-muted-foreground">Dato/tidsrom:</span>
                <span className="ml-2">{payload.date_or_timeframe}</span>
              </div>
            )}
            {payload.location && (
              <div>
                <span className="text-muted-foreground">Sted:</span>
                <span className="ml-2">{payload.location}</span>
              </div>
            )}
            {payload.budget && (
              <div>
                <span className="text-muted-foreground">Budsjett:</span>
                <span className="ml-2">{payload.budget}</span>
              </div>
            )}
          </div>
          {payload.details && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Detaljer:</p>
              <p className="text-sm whitespace-pre-line">{payload.details}</p>
            </div>
          )}
        </div>
      )}

      {/* Full message */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Fullstendig melding</p>
        <div className="p-4 rounded-lg border border-border/30 bg-card/50">
          <pre className="text-sm whitespace-pre-line font-sans">{request.message}</pre>
        </div>
      </div>
    </div>
  );
}
