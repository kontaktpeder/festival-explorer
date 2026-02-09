import { Link } from "react-router-dom";
import { Music, Camera, Calendar, Users, Lock, ChevronRight } from "lucide-react";

const BACKSTAGE_TYPES = ['photographer', 'video', 'technician', 'volunteer', 'manager'];

interface LockedModulesProps {
  projectEntities: { id: string }[];
  hostEntities: { id: string }[];
  selectedPersona: { type?: string | null } | null;
}

const MODULES = [
  { key: "on_stage", label: "På scenen", desc: "Spill og bli sett i lineup", icon: Music },
  { key: "backstage", label: "Bak scenen", desc: "Crew og kreditering", icon: Camera },
  { key: "festival", label: "Festival", desc: "Program og arrangementer", icon: Calendar },
  { key: "audience", label: "Publikum", desc: "Billetter og følgere", icon: Users },
];

export function LockedModules({ projectEntities, hostEntities, selectedPersona }: LockedModulesProps) {
  const getModuleState = (key: string) => {
    switch (key) {
      case "on_stage": return projectEntities.length > 0;
      case "festival": return hostEntities.length > 0;
      case "backstage": return !!selectedPersona?.type && BACKSTAGE_TYPES.includes(selectedPersona.type);
      case "audience": return false;
      default: return false;
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base sm:text-xl font-semibold text-foreground">Moduler</h2>
      <p className="text-[11px] sm:text-sm text-muted-foreground">
        Krever tilgang. Be om tilgang for å komme i gang.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {MODULES.map(({ key, label, desc, icon: Icon }) => {
          const isUnlocked = getModuleState(key);
          const href = isUnlocked ? "/dashboard" : "/request-access";
          const cta = isUnlocked ? "Åpne" : "Be om tilgang";

          return (
            <Link
              key={key}
              to={href}
              className={`relative p-4 rounded-lg border space-y-2 transition-colors block ${
                isUnlocked
                  ? "bg-card/60 border-border/30 hover:border-accent/40 hover:bg-card/80"
                  : "bg-card/40 border-border/20 opacity-60 hover:opacity-80"
              }`}
            >
              <div className="p-2 rounded-md bg-muted/50 w-fit">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-accent">{cta}</span>
                {!isUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />}
                {isUnlocked && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
