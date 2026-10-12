"use client";

import { useEffect } from "react";

const inactivityMs = 30 * 60 * 1000;
export default function SessionTimeout() {
  useEffect(() => { let timer: ReturnType<typeof setTimeout>; const closeSession = async () => { await fetch("/api/session", { method: "DELETE" }).catch(() => null); window.location.assign("/login?inactive=1"); }; const reset = () => { clearTimeout(timer); timer = setTimeout(() => void closeSession(), inactivityMs); }; const events = ["mousedown", "keydown", "touchstart", "scroll"] as const; events.forEach((event) => window.addEventListener(event, reset, { passive: true })); reset(); return () => { clearTimeout(timer); events.forEach((event) => window.removeEventListener(event, reset)); }; }, []);
  return null;
}

