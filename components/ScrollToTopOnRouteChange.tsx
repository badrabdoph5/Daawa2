"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

function moveToCurrentTarget() {
  const hash = window.location.hash;

  window.requestAnimationFrame(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ block: "start" });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
}

export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.addEventListener("popstate", moveToCurrentTarget);
    window.addEventListener("hashchange", moveToCurrentTarget);

    return () => {
      window.removeEventListener("popstate", moveToCurrentTarget);
      window.removeEventListener("hashchange", moveToCurrentTarget);
    };
  }, []);

  useEffect(() => {
    moveToCurrentTarget();
  }, [pathname]);

  return null;
}
