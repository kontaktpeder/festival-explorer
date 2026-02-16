import type { SharePageType } from "@/components/share/ShareButton";

export function getShareCopy(
  pageType: SharePageType,
  name: string
): { shareTitle: string; shareText: string } {
  switch (pageType) {
    case "project":
      return {
        shareTitle: `Sjekk ${name} på GIGGEN`,
        shareText: "Ny gig / musikk / oppdateringer. Følg og få varsler 👀",
      };
    case "venue":
      return {
        shareTitle: `${name} på GIGGEN`,
        shareText: `Se program og kommende konserter på ${name}.`,
      };
    case "festival":
      return {
        shareTitle: "GIGGEN Festival",
        shareText: "Én kveld. Flere scener. Live + Boiler Room. Bli med 👇",
      };
    default:
      return {
        shareTitle: `${name} på GIGGEN`,
        shareText: "Se mer på GIGGEN.",
      };
  }
}
