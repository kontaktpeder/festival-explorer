import React from "react";
import { FestivalFooter } from "@/components/festival/FestivalFooter";
import { WhatIsGiggenFooter } from "@/components/ui/WhatIsGiggenFooter";

export type FooterVariant = "festival" | "giggen" | "none";

export function PublicChrome({
  children,
  footerVariant,
}: {
  children: React.ReactNode;
  footerVariant: FooterVariant;
}) {
  return (
    <>
      {children}
      {footerVariant === "festival" ? (
        <FestivalFooter />
      ) : footerVariant === "giggen" ? (
        <WhatIsGiggenFooter />
      ) : null}
    </>
  );
}
