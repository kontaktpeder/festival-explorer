import { Link } from "react-router-dom";
import { Music, Camera, Calendar, Users, Lock } from "lucide-react";

const MODULES = [
  { key: "on_stage", label: "På scenen", desc: "Spill og bli sett i lineup", icon: Music },
  { key: "backstage", label: "Bak scenen", desc: "Crew og kreditering", icon: Camera },
  { key: "festival", label: "Festival", desc: "Program og arrangementer", icon: Calendar },
  { key: "audience", label: "Publikum", desc: "Billetter og følgere", icon: Users },
];

export function LockedModules() {
  return (
    <section className="space-y-3">
      <h2 className="text-base sm:text-xl font-semibold text-foreground">Moduler</h2>
      <p className="text-[11px] sm:text-sm text-muted-foreground">
        Krever tilgang. Be om tilgang for å komme i gang.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {MODULES.map(({ key, label, desc, icon: Icon }) => (
          <div
            key={key}
            className="relative p-4 rounded-lg bg-card/40 border border-border/20 opacity-60 space-y-2"
          >
            <div className="p-2 rounded-md bg-muted/50 w-fit">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
            <Lock className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Link
          to="/request-access"
          className="text-sm text-accent hover:text-accent/80 underline underline-offset-2 transition-colors"
        >
          Be om tilgang →
        </Link>
      </div>
    </section>
  );
}
