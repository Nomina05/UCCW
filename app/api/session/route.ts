import { jwtVerify, SignJWT } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { resolveProfileAccess } from "../../../lib/profile-role";

export async function GET(request: NextRequest) { const token = request.cookies.get("uccw_session")?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const access = await resolveProfileAccess(verified.payload); return NextResponse.json({ authenticated: true, ...access, displayName: access.displayName || verified.payload.email, email: verified.payload.email }); } catch { return NextResponse.json({ authenticated: false }, { status: 401 }); } }

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

export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set("uccw_session", "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" }); return response; }

