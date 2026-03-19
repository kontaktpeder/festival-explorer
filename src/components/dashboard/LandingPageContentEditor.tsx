import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

const LANDING_CONTENT_ID = 1;

type FormState = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_video_url: string;
  proof_enabled: boolean;
  proof_show_attendees: boolean;
  section_case_enabled: boolean;
  section_case_title: string;
  section_case_subtitle: string;
};

export function LandingPageContentEditor() {
  const qc = useQueryClient();

  const { data: row, isLoading } = useQuery({
    queryKey: ["landing-page-content", LANDING_CONTENT_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("landing_page_content" as any)
        .select("*")
        .eq("id", LANDING_CONTENT_ID)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const [form, setForm] = useState<FormState>({
    hero_title: "",
    hero_subtitle: "",
    hero_cta_text: "",
    hero_video_url: "",
    proof_enabled: false,
    proof_show_attendees: false,
    section_case_enabled: true,
    section_case_title: "",
    section_case_subtitle: "",
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      hero_title: row.hero_title ?? "",
      hero_subtitle: row.hero_subtitle ?? "",
      hero_cta_text: row.hero_cta_text ?? "",
      hero_video_url: row.hero_video_url ?? "",
      proof_enabled: row.proof_enabled ?? false,
      proof_show_attendees: row.proof_show_attendees ?? false,
      section_case_enabled: row.section_case_enabled ?? true,
      section_case_title: row.section_case_title ?? "",
      section_case_subtitle: row.section_case_subtitle ?? "",
    });
  }, [row]);

  const upsert = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("landing_page_content")
        .upsert({ id: LANDING_CONTENT_ID, ...form }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["landing-page-content", LANDING_CONTENT_ID] });
      toast({ title: "Landing-innhold lagret" });
    },
    onError: (e: any) => {
      toast({ title: "Feil ved lagring", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) return <p className="p-6 text-muted-foreground">Laster landing-innhold…</p>;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Landing / CMS-light</h2>
          <p className="text-sm text-muted-foreground">Rediger tekst, video og visnings-toggles uten deploy.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Toggles */}
        <div className="grid sm:grid-cols-3 gap-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">Vis proof-tall</Label>
            <Switch checked={form.proof_enabled} onCheckedChange={(v) => set("proof_enabled", v)} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">Vis oppmøtte</Label>
            <Switch
              checked={form.proof_show_attendees}
              onCheckedChange={(v) => set("proof_show_attendees", v)}
              disabled={!form.proof_enabled}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm">Vis Case-seksjon</Label>
            <Switch checked={form.section_case_enabled} onCheckedChange={(v) => set("section_case_enabled", v)} />
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4">
          <div>
            <Label className="text-sm">Hero title</Label>
            <Input value={form.hero_title} onChange={(e) => set("hero_title", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Hero subtitle</Label>
            <Textarea value={form.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Hero CTA text</Label>
            <Input value={form.hero_cta_text} onChange={(e) => set("hero_cta_text", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Hero video URL (Vimeo)</Label>
            <Input
              value={form.hero_video_url}
              onChange={(e) => set("hero_video_url", e.target.value)}
              placeholder="https://vimeo.com/123456789"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm">Case title</Label>
            <Input value={form.section_case_title} onChange={(e) => set("section_case_title", e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm">Case subtitle</Label>
            <Textarea
              value={form.section_case_subtitle}
              onChange={(e) => set("section_case_subtitle", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {upsert.isPending ? "Lagrer…" : "Lagre landing-innhold"}
        </Button>
      </div>
    </div>
  );
}
