import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/ui/LoadingState";
import { format, subDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Search, Mail, Calendar, ChevronRight } from "lucide-react";
import { STATUS_LABELS, ROLE_TYPE_OPTIONS } from "@/types/access-request";
import type { AccessRequestStatus } from "@/types/access-request";

const STATUS_VARIANT: Record<AccessRequestStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  approved: "outline",
  rejected: "destructive",
};

export default function AdminAccessRequests() {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useAccessRequests();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "30days">("30days");

  const filteredRequests = requests?.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus =
      statusFilter === "all" || req.status === statusFilter;

    const matchesDate =
      dateFilter === "all" ||
      new Date(req.created_at) >= subDays(new Date(), 30);

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (isLoading) return <LoadingState message="Laster forespørsler..." />;

  const newCount = requests?.filter((r) => r.status === "new").length ?? 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-lg md:text-2xl font-bold">
          Tilgangsforespørsler
          {newCount > 0 && (
            <Badge variant="default" className="ml-2 align-middle text-[10px]">
              {newCount} nye
            </Badge>
          )}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Behandle forespørsler om tilgang til GIGGEN
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk navn, e-post..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="new">Ny ({newCount})</SelectItem>
            <SelectItem value="approved">Godkjent</SelectItem>
            <SelectItem value="rejected">Avslått</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as "all" | "30days")}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30days">Siste 30 dager</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredRequests?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Ingen forespørsler funnet
          </p>
        ) : (
          filteredRequests?.map((req) => {
            const roleLabel =
              ROLE_TYPE_OPTIONS.find((o) => o.value === req.role_type)?.label ??
              req.role_type;

            return (
              <button
                key={req.id}
                onClick={() => navigate(`/admin/access-requests/${req.id}`)}
                className="w-full text-left bg-card border border-border/30 rounded-lg p-3 md:p-4 hover:bg-muted/40 active:bg-muted/60 transition-colors flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {req.name}
                    </span>
                    <Badge
                      variant={STATUS_VARIANT[req.status as AccessRequestStatus] ?? "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {STATUS_LABELS[req.status as AccessRequestStatus] ?? req.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {req.email}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(req.created_at), "d. MMM yyyy", {
                        locale: nb,
                      })}
                    </span>
                  </div>

                  {req.message && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {req.message}
                    </p>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
