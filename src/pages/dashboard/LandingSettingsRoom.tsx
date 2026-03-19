import { BackstageShell } from "@/components/layout/BackstageShell";
import { LandingPageContentEditor } from "@/components/dashboard/LandingPageContentEditor";

export default function LandingSettingsRoom() {
  return (
    <BackstageShell title="Landingsside" subtitle="CMS-light" backTo="/dashboard">
      <div className="max-w-2xl mx-auto">
        <LandingPageContentEditor />
      </div>
    </BackstageShell>
  );
}
