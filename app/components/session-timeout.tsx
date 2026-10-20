"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const inactivityMs = 10 * 60 * 1000;
export default function SessionTimeout() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/login") return;
    let timer: ReturnType<typeof setTimeout>;
    let redirecting = false;
    const goToLogin = (reason = "") => { if (redirecting) return; redirecting = true; window.location.replace(`/login${reason}`); };
    const closeSession = async () => { await fetch("/api/session", { method: "DELETE" }).catch(() => null); goToLogin("?inactive=1"); };
    const heartbeat = async () => { const response = await fetch("/api/session", { cache: "no-store" }).catch(() => null); if (response?.status === 409) goToLogin("?replaced=1"); else if (response?.status === 401) goToLogin(); };
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => void closeSession(), inactivityMs); };
    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    const heartbeatTimer = window.setInterval(() => void heartbeat(), 60 * 1000);
    reset(); void heartbeat();
    return () => { clearTimeout(timer); window.clearInterval(heartbeatTimer); events.forEach((event) => window.removeEventListener(event, reset)); };
  }, [pathname]);
  return null;
}

