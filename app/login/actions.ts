"use server";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeRole } from "../../lib/security";

const encoder = new TextEncoder();
const demoEmail = "demo@uccw.local";
const demoPassword = "UccwDemo2026!";
const demoSessionSecret = "uccw-demo-session-only-not-for-production-2026";

type SessionData = { email: string; userId?: string; accessToken?: string; refreshToken?: string; role: string; sessionId: string; mustChangePassword?: boolean };
async function issueSession(data: SessionData) {
  const secret = process.env.SESSION_SECRET || demoSessionSecret;
  const token = await new SignJWT({ ...data, provider: data.userId ? "supabase" : "demo" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(encoder.encode(secret));
  const cookieStore = await cookies();
  cookieStore.set("uccw_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  cookieStore.set("uccw_pending_session", "", { httpOnly: true, maxAge: 0, path: "/" });
}

async function registerActiveSession(url: string, key: string, data: SessionData) {
  if (!data.userId || !data.accessToken) return;
  const userAgent = (await headers()).get("user-agent") || "Browser";
  const deviceLabel = /mobile|android|iphone|ipad/i.test(userAgent) ? "Mobile device" : "Computer";
  await fetch(`${url.replace(/\/$/, "")}/rest/v1/active_sessions?on_conflict=user_id`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${data.accessToken}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: data.userId, session_id: data.sessionId, device_label: deviceLabel, last_seen: new Date().toISOString(), created_at: new Date().toISOString() }), cache: "no-store" });
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const sessionSecret = process.env.SESSION_SECRET || demoSessionSecret;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  let userId: string | undefined;
  let role = "Administrator";
  let mustChangePassword = false;
  const sessionId = crypto.randomUUID();

  if (supabaseUrl && supabaseAnonKey) {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => null) as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id?: string; user_metadata?: { must_change_password?: boolean } }; error_code?: string; msg?: string } | null;
    if (!response.ok || !result?.user?.id) redirect(result?.error_code === "email_not_confirmed" || result?.msg?.toLowerCase().includes("email not confirmed") ? "/login?unconfirmed=1" : "/login?error=1");
    userId = result.user.id;
    mustChangePassword = result.user.user_metadata?.must_change_password === true;
    var accessToken = result.access_token;
    var refreshToken = result.refresh_token;
    const profileResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?select=profile,active&id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const profiles = profileResponse.ok ? await profileResponse.json() as { profile?: string; active?: boolean }[] : [];
    if (profiles[0]?.active === false) redirect("/login?disabled=1");
    role = normalizeRole(profiles[0]?.profile);
    const activeResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/active_sessions?select=session_id,last_seen,device_label&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (activeResponse.ok) {
      const activeRows = await activeResponse.json() as { session_id?: string; last_seen?: string; device_label?: string }[];
      const active = activeRows[0];
      if (active?.session_id && active.last_seen && Date.now() - new Date(active.last_seen).getTime() < 10 * 60 * 1000) {
        const pending = await new SignJWT({ email, userId, accessToken, refreshToken, role, sessionId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(encoder.encode(sessionSecret));
        const cookieStore = await cookies();
        cookieStore.set("uccw_pending_session", pending, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 5 * 60, path: "/" });
        redirect(`/login?active=1&device=${encodeURIComponent(active.device_label || "another device")}`);
      }
    }
  } else {
    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || demoEmail;
    const configuredPassword = process.env.ADMIN_PASSWORD || demoPassword;
    if (email !== configuredEmail || password !== configuredPassword) redirect("/login?error=1");
  }

  const session = { email, userId, accessToken, refreshToken, role, sessionId, mustChangePassword };
  if (supabaseUrl && supabaseAnonKey) await registerActiveSession(supabaseUrl, supabaseAnonKey, session);
  await issueSession(session);
  redirect(mustChangePassword ? "/cambiar-clave" : "/dashboard");
}

export async function continueSession() {
  const cookieStore = await cookies();
  const pending = cookieStore.get("uccw_pending_session")?.value;
  const secret = process.env.SESSION_SECRET || demoSessionSecret;
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY;
  if (!pending || !url || !key) redirect("/login?error=1");
  let mustChangePassword = false;
  try {
    const verified = await jwtVerify(pending, encoder.encode(secret));
    const data: SessionData = { email: String(verified.payload.email || ""), userId: String(verified.payload.userId || ""), accessToken: String(verified.payload.accessToken || ""), refreshToken: String(verified.payload.refreshToken || ""), role: String(verified.payload.role || "Employee"), sessionId: String(verified.payload.sessionId || crypto.randomUUID()), mustChangePassword: verified.payload.mustChangePassword === true };
    await registerActiveSession(url, key, data); await issueSession(data);
    mustChangePassword = data.mustChangePassword === true;
  } catch { redirect("/login?error=1"); }
  redirect(mustChangePassword ? "/cambiar-clave" : "/dashboard");
}
