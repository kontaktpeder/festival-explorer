import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import giggenLogo from "@/assets/giggen-logo-new.png";

export function StaticLogo() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (location.pathname === "/" || location.pathname.startsWith("/festival/")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  }, [location.pathname, navigate]);

  return (
    <Link
      to="/"
      onClick={handleClick}
      className="fixed z-50 left-4 top-2"
    >
      <img
        src={giggenLogo}
        alt="Giggen"
        className="h-20 w-auto opacity-90 hover:opacity-100 transition-opacity duration-200"
      />
    </Link>
  );
}
