"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsAPI } from "@/lib/api/client";

function getSessionId(): string {
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    sid = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("session_id", sid);
  }
  return sid;
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const track = async () => {
      try {
        const tourMatch = pathname.match(/^\/tour\/(\d+)/);
        await analyticsAPI.trackVisit({
          page_url: pathname,
          session_id: getSessionId(),
          tour_id: tourMatch ? parseInt(tourMatch[1], 10) : null,
        });
      } catch {
        // Analytics must never break the page.
      }
    };
    track();
  }, [pathname]);

  return null;
}
