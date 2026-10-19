import { jwtVerify, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { resolveProfileAccess } from "../../../lib/profile-role";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026"));
    const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY; const accessToken = verified.payload.accessToken; const userId = verified.payload.userId; const sessionId = verified.payload.sessionId;
    if (url && key && typeof accessToken === "string" && typeof userId === "string" && typeof sessionId === "string") {
      const activeResponse = await fetch(`${url}/rest/v1/active_sessions?select=session_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      if (activeResponse.ok) {
        const rows = await activeResponse.json() as { session_id?: string }[];
        if (rows[0]?.session_id && rows[0].session_id !== sessionId) return NextResponse.json({ authenticated: false, reason: "replaced" }, { status: 409 });
        if (rows[0]?.session_id === sessionId) await fetch(`${url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(userId)}&session_id=eq.${encodeURIComponent(sessionId)}`, { method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ last_seen: new Date().toISOString() }), cache: "no-store" });
      }
    }
    const access = await resolveProfileAccess(verified.payload); return NextResponse.json({ authenticated: true, ...access, displayName: access.displayName || verified.payload.email, email: verified.payload.email });
  } catch { return NextResponse.json({ authenticated: false }, { status: 401 }); }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value;
  const secret = process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026";
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) return NextResponse.json({ error: "Session cannot be renewed." }, { status: 401 });
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const refreshToken = verified.payload.refreshToken;
    if (typeof refreshToken !== "string" || !refreshToken) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store" });
    const auth = await authResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; user?: { id?: string; email?: string } } | null;
    if (!authResponse.ok || !auth?.access_token) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
    const refreshed = await new SignJWT({ ...verified.payload, accessToken: auth.access_token, refreshToken: auth.refresh_token || refreshToken, userId: auth.user?.id || verified.payload.userId, email: auth.user?.email || verified.payload.email })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(new TextEncoder().encode(secret));
    const response = NextResponse.json({ ok: true });
    response.cookies.set("uccw_session", refreshed, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
    return response;
  } catch { return NextResponse.json({ error: "Please sign in again." }, { status: 401 }); }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value; const secret = process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026";
  if (token) try { const verified = await jwtVerify(token, new TextEncoder().encode(secret)); const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY; const accessToken = verified.payload.accessToken; const userId = verified.payload.userId; const sessionId = verified.payload.sessionId; if (url && key && typeof accessToken === "string" && typeof userId === "string" && typeof sessionId === "string") await fetch(`${url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(userId)}&session_id=eq.${encodeURIComponent(sessionId)}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" }); } catch { /* Expired sessions are cleared locally. */ }
  const response = NextResponse.json({ ok: true }); response.cookies.set("uccw_session", "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" }); return response;
}

