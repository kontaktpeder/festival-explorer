import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import giggenLogo from "@/assets/giggen-logo-full.png";

export function StaticLogo() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is logged in
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (location.pathname === "/" || location.pathname.startsWith("/festival/")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  }, [location.pathname, navigate]);

  const showCentered = isMobile && isScrolled;

  return (
    <>
      
      {/* Logo - Bold text with orange accent */}
      <Link
        to="/"
        onClick={handleClick}
        className={`fixed z-50 transition-all duration-500 ease-out ${
          showCentered 
            ? 'left-1/2 -translate-x-1/2' 
            : 'left-4 translate-x-0'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 12px)' 
            : 'calc(var(--safe-top, 0px) + 16px)'
        }}
      >
        <img 
          src={giggenLogo} 
          alt="GIGGEN - festival for en kveld"
          className={`transition-all duration-300 ${
            showCentered 
              ? 'h-8' 
              : 'h-10 md:h-12'
          }`}
        />
      </Link>

      {/* BACKSTAGE link - top right, smaller when logo is centered */}
      <Link
        to={session ? "/dashboard" : "/admin/login"}
        className={`fixed z-50 right-4 transition-all duration-500 ease-out ${
          showCentered ? 'opacity-70' : 'opacity-100'
        }`}
        style={{
          top: showCentered 
            ? 'calc(var(--safe-top, 0px) + 16px)' 
            : 'calc(var(--safe-top, 0px) + 20px)'
        }}
      >
        <span className={`font-medium text-foreground/80 hover:text-accent transition-colors uppercase tracking-wider ${
          showCentered ? 'text-[10px]' : 'text-sm'
        }`}>
          BACKSTAGE
        </span>
      </Link>
    </>
  );
}
