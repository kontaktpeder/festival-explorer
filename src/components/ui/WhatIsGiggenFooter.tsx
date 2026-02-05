import { Link } from "react-router-dom";

/**
 * "Hva er GIGGEN?" footer section
 * Displays a subtle informational footer on public persona/project/venue pages
 */
export function WhatIsGiggenFooter() {
  return (
    <section className="py-16 md:py-20 px-6 border-t border-border/20">
      <div className="max-w-xl mx-auto text-center">
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">
          Hva er GIGGEN?
        </h3>
        <p className="text-sm md:text-base text-muted-foreground/70 leading-relaxed mb-6">
          Et fellesskap for dem som jobber med eksisterende musikkscener – og dem som ønsker å skape nye.
        </p>
        <Link
          to="/om-giggen"
          className="inline-flex items-center text-sm text-primary/70 hover:text-primary transition-colors duration-300"
        >
          Les mer om GIGGEN
          <span className="ml-1.5">→</span>
        </Link>
      </div>
    </section>
  );
}
