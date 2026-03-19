import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { CreditsPickerEditor } from "@/components/admin/CreditsPickerEditor";

interface Props {
  festivalId: string;
  festivalSlug?: string;
}

export function FestivalCaseEditor({ festivalId, festivalSlug }: Props) {
  const qc = useQueryClient();

  const { data: row, isLoading } = useQuery({
    queryKey: ["festival-case-content", festivalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("festival_case_content" as any)
        .select("*")
        .eq("festival_id", festivalId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [form, setForm] = useState({
    case_enabled: false,
    case_public_show_attendees: false,
    case_summary: "",
    case_what_was_this: "",
    case_what_worked: "",
    case_challenges: "",
    case_video_embed_url: "",
    case_quote: "",
  });

  useEffect(() => {
    if (row) {
      setForm({
        case_enabled: row.case_enabled ?? false,
        case_public_show_attendees: row.case_public_show_attendees ?? false,
        case_summary: row.case_summary ?? "",
        case_what_was_this: row.case_what_was_this ?? "",
        case_what_worked: row.case_what_worked ?? "",
        case_challenges: row.case_challenges ?? "",
        case_video_embed_url: row.case_video_embed_url ?? "",
        case_quote: row.case_quote ?? "",
      });
    }
  }, [row]);

  const upsert = useMutation({
    mutationFn: async () => {
      if (row?.id) {
        const { error } = await supabase
          .from("festival_case_content" as any)
          .update(form as any)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("festival_case_content" as any)
          .insert({ ...form, festival_id: festivalId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["festival-case-content", festivalId] });
      toast({ title: "Case-innhold lagret" });
    },
    onError: (e: any) => {
      toast({ title: "Feil ved lagring", description: e.message, variant: "destructive" });
    },
  });

  const set = (key: keyof typeof form, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) return <p className="text-sm text-muted-foreground">Laster case-innhold…</p>;

  const caseUrl = festivalSlug ? `/festival/case/${festivalSlug}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Case / Arkiv</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rediger innhold for den offentlige case-siden.
          </p>
        </div>
        {caseUrl && form.case_enabled && (
          <Link
            to={caseUrl}
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Se case <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="case_enabled" className="text-sm">Publisert (synlig for alle)</Label>
          <Switch
            id="case_enabled"
            checked={form.case_enabled}
            onCheckedChange={(v) => set("case_enabled", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="case_attendees" className="text-sm">Vis antall oppmøtte</Label>
          <Switch
            id="case_attendees"
            checked={form.case_public_show_attendees}
            onCheckedChange={(v) => set("case_public_show_attendees", v)}
          />
        </div>
      </div>

      {/* Text fields */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm">Oppsummering</Label>
          <Textarea
            value={form.case_summary}
            onChange={(e) => set("case_summary", e.target.value)}
            placeholder="Kort oppsummering av casen…"
            rows={3}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Hva var dette?</Label>
          <Textarea
            value={form.case_what_was_this}
            onChange={(e) => set("case_what_was_this", e.target.value)}
            placeholder="Beskriv konseptet…"
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Hva fungerte (1 punkt per linje)</Label>
          <Textarea
            value={form.case_what_worked}
            onChange={(e) => set("case_what_worked", e.target.value)}
            placeholder="Alt gikk som planlagt&#10;Billettscanning fungerte sømløst"
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Utfordringer / læring (1 punkt per linje)</Label>
          <Textarea
            value={form.case_challenges}
            onChange={(e) => set("case_challenges", e.target.value)}
            placeholder="Trenger bedre kommunikasjon&#10;Manglet backup-plan for lyd"
            rows={4}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Video (Vimeo URL eller embed)</Label>
          <Input
            value={form.case_video_embed_url}
            onChange={(e) => set("case_video_embed_url", e.target.value)}
            placeholder="https://vimeo.com/1174758839"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Sitat</Label>
          <Textarea
            value={form.case_quote}
            onChange={(e) => set("case_quote", e.target.value)}
            placeholder="Et sitat fra en deltaker eller arrangør…"
            rows={2}
            className="mt-1"
          />
        </div>
      </div>

      <Button
        onClick={() => upsert.mutate()}
        disabled={upsert.isPending}
        className="gap-2"
      >
        <Save className="h-4 w-4" />
        {upsert.isPending ? "Lagrer…" : "Lagre case-innhold"}
      </Button>
    </div>
  );
}
