import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026");
async function pending() { const value = (await cookies()).get("uccw_mfa_pending")?.value; if (!value) return null; return jwtVerify(value, secret()).then((item) => item.payload).catch(() => null); }
function authHeaders(key: string, accessToken: string) { return { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }; }

export async function GET() {
  const data = await pending(); const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY;
  if (!data || !url || !key || typeof data.accessToken !== "string") return NextResponse.json({ error: "MFA session expired." }, { status: 401 });
  const response = await fetch(`${url}/auth/v1/user`, { headers: authHeaders(key, data.accessToken), cache: "no-store" });
  const user = await response.json().catch(() => null) as { factors?: { id: string; factor_type: string; status: string; friendly_name?: string }[] } | null;
  if (!response.ok) return NextResponse.json({ error: "Could not load MFA factors." }, { status: response.status });
  return NextResponse.json({ factors: (user?.factors || []).filter((factor) => factor.factor_type === "totp" && factor.status === "verified") });
}

export async function POST(request: NextRequest) {
  const data = await pending(); const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY;
  if (!data || !url || !key || typeof data.accessToken !== "string") return NextResponse.json({ error: "MFA session expired. Sign in again." }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: "enroll" | "verify"; factorId?: string; code?: string } | null;
  if (body?.action === "enroll") {
    const response = await fetch(`${url}/auth/v1/factors`, { method: "POST", headers: authHeaders(key, data.accessToken), body: JSON.stringify({ factor_type: "totp", friendly_name: "UCCW Administrator" }) });
    const result = await response.json().catch(() => null) as { id?: string; totp?: { qr_code?: string; secret?: string; uri?: string }; msg?: string } | null;
    if (!response.ok) return NextResponse.json({ error: result?.msg || "Could not enroll the authenticator." }, { status: response.status });
    return NextResponse.json({ factorId: result?.id, totp: result?.totp });
  }
  if (body?.action !== "verify" || !body.factorId || !/^\d{6}$/.test(body.code || "")) return NextResponse.json({ error: "Enter a valid 6-digit code." }, { status: 400 });
  const challengeResponse = await fetch(`${url}/auth/v1/factors/${encodeURIComponent(body.factorId)}/challenge`, { method: "POST", headers: authHeaders(key, data.accessToken), body: "{}" });
  const challenge = await challengeResponse.json().catch(() => null) as { id?: string; msg?: string } | null;
  if (!challengeResponse.ok || !challenge?.id) return NextResponse.json({ error: challenge?.msg || "Could not start MFA verification." }, { status: challengeResponse.status });
  const verifyResponse = await fetch(`${url}/auth/v1/factors/${encodeURIComponent(body.factorId)}/verify`, { method: "POST", headers: authHeaders(key, data.accessToken), body: JSON.stringify({ challenge_id: challenge.id, code: body.code }) });
  const verified = await verifyResponse.json().catch(() => null) as { access_token?: string; refresh_token?: string; msg?: string } | null;
  if (!verifyResponse.ok) return NextResponse.json({ error: verified?.msg || "Incorrect authentication code." }, { status: verifyResponse.status });
  const sessionId = crypto.randomUUID(); const accessToken = verified?.access_token || data.accessToken; const refreshToken = verified?.refresh_token || data.refreshToken;
  const session = await new SignJWT({ email: data.email, userId: data.userId, accessToken, refreshToken, role: data.role, sessionId, mustChangePassword: data.mustChangePassword === true, provider: "supabase", mfaVerified: true }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
  await fetch(`${url}/rest/v1/active_sessions?on_conflict=user_id`, { method: "POST", headers: { ...authHeaders(key, accessToken as string), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ user_id: data.userId, session_id: sessionId, device_label: "MFA verified device", last_seen: new Date().toISOString(), created_at: new Date().toISOString() }) });
  const response = NextResponse.json({ ok: true, redirect: data.mustChangePassword === true ? "/cambiar-clave" : "/dashboard" });
  response.cookies.set("uccw_session", session, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  response.cookies.set("uccw_mfa_pending", "", { httpOnly: true, maxAge: 0, path: "/" }); return response;
}
