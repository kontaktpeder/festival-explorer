import { useEffect, useState } from "react";

type Props = {
  title: string;
};

function hhmmss(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function LiveHeader({ title }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-border/20 pb-4 mb-5">
      <div className="text-2xl font-bold tracking-wide text-foreground">GIGGEN LIVE</div>
      <div className="text-lg text-muted-foreground truncate px-4">{title}</div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-destructive text-sm font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
          LIVE
        </span>
        <span className="font-mono text-xl text-foreground">{hhmmss(now)}</span>
      </div>
    </header>
  );
}
