"use client";

import { useEffect } from "react";

const inactivityMs = 10 * 60 * 1000;
export default function SessionTimeout() {
  useEffect(() => { let timer: ReturnType<typeof setTimeout>; const closeSession = async () => { await fetch("/api/session", { method: "DELETE" }).catch(() => null); window.location.assign("/login?inactive=1"); }; const heartbeat = async () => { const response = await fetch("/api/session", { cache: "no-store" }).catch(() => null); if (response && (response.status === 409 || response.status === 401)) window.location.assign(response.status === 409 ? "/login?replaced=1" : "/login"); }; const reset = () => { clearTimeout(timer); timer = setTimeout(() => void closeSession(), inactivityMs); }; const events = ["mousedown", "keydown", "touchstart", "scroll"] as const; events.forEach((event) => window.addEventListener(event, reset, { passive: true })); const heartbeatTimer = window.setInterval(() => void heartbeat(), 60 * 1000); reset(); void heartbeat(); return () => { clearTimeout(timer); window.clearInterval(heartbeatTimer); events.forEach((event) => window.removeEventListener(event, reset)); }; }, []);
  return null;
}

