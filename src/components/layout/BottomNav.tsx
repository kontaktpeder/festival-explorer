import { Link, useLocation } from "react-router-dom";
import { Calendar, Compass, Search, Settings } from "lucide-react";

const navItems = [
  { to: "/festival/giggen-sessions", icon: Calendar, label: "Festival" },
  { to: "/explore", icon: Compass, label: "Utforsk" },
  { to: "/search", icon: Search, label: "Søk" },
  { to: "/admin", icon: Settings, label: "Admin" },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path.startsWith("/festival") && location.pathname.startsWith("/festival")) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <nav className="bottom-nav z-50">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              isActive(to)
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
