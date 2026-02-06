import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContactRequests } from "@/hooks/useContactRequests";
import { getRequestTypeLabel, REQUEST_TYPE_OPTIONS } from "@/types/contact";
import type { ContactMode, RequestType } from "@/types/contact";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Search, Mail, ArrowRight } from "lucide-react";

export default function AdminInbox() {
  const [modeFilter, setModeFilter] = useState<ContactMode | "">("");
  const [requestTypeFilter, setRequestTypeFilter] = useState<RequestType | "">("");
  const [search, setSearch] = useState("");

  const { data: allRequests, isLoading } = useContactRequests({
    mode: modeFilter || undefined,
    search: search || undefined,
  });

  // Client-side filter for request_type (from template_payload)
  const requests = allRequests?.filter((req) => {
    if (!requestTypeFilter) return true;
    return req.template_payload?.request_type === requestTypeFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground text-sm">Alle kontaktforespørsler sendt via GIGGEN</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk mottaker, avsender, emne..."
            className="pl-9 bg-transparent border-border/50"
          />
        </div>
        <Select value={modeFilter || "all"} onValueChange={(v) => setModeFilter(v === "all" ? "" : v as ContactMode)}>
          <SelectTrigger className="w-36 bg-transparent border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle modi</SelectItem>
            <SelectItem value="free">Fritekst</SelectItem>
            <SelectItem value="template">Mal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={requestTypeFilter || "all"} onValueChange={(v) => setRequestTypeFilter(v === "all" ? "" : v as RequestType)}>
          <SelectTrigger className="w-44 bg-transparent border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kategorier</SelectItem>
            {REQUEST_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Laster...</p>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Mail className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">Ingen forespørsler ennå</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const templateType = req.template_payload?.request_type;
            return (
              <Link
                key={req.id}
                to={`/admin/inbox/${req.id}`}
                className="group flex items-center gap-4 p-4 rounded-lg border border-border/30 bg-card/50 hover:bg-card/80 transition-all"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {req.sender_name}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {req.recipient_name}
                    </span>
                  </div>
                  {req.subject && (
                    <p className="text-sm text-muted-foreground/70 truncate">{req.subject}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {req.mode === "template" ? "Mal" : "Fritekst"}
                    </Badge>
                    {templateType && (
                      <Badge variant="secondary" className="text-xs">
                        {getRequestTypeLabel(templateType)}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(req.created_at), "d. MMM yyyy, HH:mm", { locale: nb })}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
