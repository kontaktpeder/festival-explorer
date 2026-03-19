import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  const positionsRef = useRef<Map<string, number>>(new Map());
  const currentKeyRef = useRef<string>(location.key);

  useEffect(() => {
    currentKeyRef.current = location.key;
  }, [location.key]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      positionsRef.current.set(currentKeyRef.current, window.scrollY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;

      let done = false;
      for (let i = 0; i < 6; i++) {
        window.setTimeout(() => {
          if (done) return;
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ block: "start" });
            done = true;
          }
        }, i * 100);
      }

      return;
    }

    if (navigationType === "POP") {
      const y = positionsRef.current.get(location.key);
      window.scrollTo(0, typeof y === "number" ? y : 0);
      return;
    }

    window.scrollTo(0, 0);
  }, [location.key, location.hash, navigationType]);
}
