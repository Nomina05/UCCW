import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { resolveProfileAccess } from "../../../../lib/profile-role";

type AdminUser = { id: string; email?: string; last_sign_in_at?: string; created_at?: string; user_metadata?: Record<string, unknown> };
type Profile = { id: string; active?: boolean; blocked_at?: string; blocked_by?: string };
type ActiveSession = { user_id: string; session_id: string; device_label?: string; last_seen?: string; created_at?: string };
type Attempt = { id: string; user_id?: string; email: string; successful: boolean; reason?: string; ip_address?: string; user_agent?: string; created_at: string };

async function adminContext(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value;
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !serviceKey) return null;
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026"));
    const access = await resolveProfileAccess(verified.payload);
    if (access.role !== "Administrator") return null;
    return { url, serviceKey, actor: String(verified.payload.email || "Administrator") };
  } catch { return null; }
}

function headers(key: string, extra: Record<string, string> = {}) { return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra }; }

async function writeAudit(context: NonNullable<Awaited<ReturnType<typeof adminContext>>>, action: string, userId: string, details: Record<string, unknown>) {
  const data = { id: crypto.randomUUID(), action, module: "users", resource: "users", recordId: userId, actor: context.actor, role: "Administrator", details, createdAt: new Date().toISOString() };
  await fetch(`${context.url}/rest/v1/audit_logs`, { method: "POST", headers: headers(context.serviceKey, { Prefer: "return=minimal" }), body: JSON.stringify({ id: data.id, action, module: "users", resource: "users", record_id: userId, actor_email: context.actor, data }) }).catch(() => null);
}

export async function GET(request: NextRequest) {
  const context = await adminContext(request);
  if (!context) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const [authResponse, profileResponse, sessionResponse, attemptResponse] = await Promise.all([
    fetch(`${context.url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: headers(context.serviceKey), cache: "no-store" }),
    fetch(`${context.url}/rest/v1/profiles?select=id,active,blocked_at,blocked_by`, { headers: headers(context.serviceKey), cache: "no-store" }),
    fetch(`${context.url}/rest/v1/active_sessions?select=user_id,session_id,device_label,last_seen,created_at`, { headers: headers(context.serviceKey), cache: "no-store" }),
    fetch(`${context.url}/rest/v1/login_attempts?select=id,user_id,email,successful,reason,ip_address,user_agent,created_at&order=created_at.desc&limit=500`, { headers: headers(context.serviceKey), cache: "no-store" })
  ]);
  if (!authResponse.ok) return NextResponse.json({ error: "Could not load authentication users." }, { status: authResponse.status });
  const auth = await authResponse.json() as { users?: AdminUser[] };
  const profiles = profileResponse.ok ? await profileResponse.json() as Profile[] : [];
  const sessions = sessionResponse.ok ? await sessionResponse.json() as ActiveSession[] : [];
  const attempts = attemptResponse.ok ? await attemptResponse.json() as Attempt[] : [];
  const profileById = new Map(profiles.map((item) => [item.id, item]));
  const activeCutoff = Date.now() - 10 * 60 * 1000;
  const sessionById = new Map(sessions.map((item) => [item.user_id, { ...item, active: Boolean(item.last_seen && new Date(item.last_seen).getTime() >= activeCutoff) }]));
  const failedById = new Map<string, Attempt[]>();
  attempts.filter((item) => !item.successful).forEach((item) => { const key = item.user_id || item.email.toLowerCase(); failedById.set(key, [...(failedById.get(key) || []), item]); });
  const users = (auth.users || []).map((user) => ({ id: user.id, email: user.email || "", lastSignInAt: user.last_sign_in_at || null, createdAt: user.created_at || null, mustChangePassword: user.user_metadata?.must_change_password === true, blocked: profileById.get(user.id)?.active === false, blockedAt: profileById.get(user.id)?.blocked_at || null, session: sessionById.get(user.id) || null, failedAttempts: failedById.get(user.id) || failedById.get((user.email || "").toLowerCase()) || [] }));
  return NextResponse.json({ users, attempts });
}

export async function PATCH(request: NextRequest) {
  const context = await adminContext(request);
  if (!context) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const payload = await request.json().catch(() => null) as { userId?: string; action?: "block" | "unblock" | "temporary-password" | "force-password-change" | "close-session"; password?: string } | null;
  if (!payload?.userId || !payload.action) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const authUrl = `${context.url}/auth/v1/admin/users/${encodeURIComponent(payload.userId)}`;
  if (payload.action === "block" || payload.action === "unblock") {
    const active = payload.action === "unblock";
    const response = await fetch(`${context.url}/rest/v1/profiles?id=eq.${encodeURIComponent(payload.userId)}`, { method: "PATCH", headers: headers(context.serviceKey, { Prefer: "return=minimal" }), body: JSON.stringify({ active, blocked_at: active ? null : new Date().toISOString(), blocked_by: active ? null : context.actor, updated_at: new Date().toISOString() }) });
    if (!response.ok) return NextResponse.json({ error: "Could not update account status. Apply the user administration migration first." }, { status: response.status });
    if (!active) await fetch(`${context.url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(payload.userId)}`, { method: "DELETE", headers: headers(context.serviceKey) });
  } else if (payload.action === "temporary-password") {
    if (!payload.password || payload.password.length < 8 || !/[a-z]/.test(payload.password) || !/[A-Z]/.test(payload.password) || !/\d/.test(payload.password)) return NextResponse.json({ error: "Temporary password must have at least 8 characters, uppercase, lowercase, and a number." }, { status: 400 });
    const response = await fetch(authUrl, { method: "PUT", headers: headers(context.serviceKey), body: JSON.stringify({ password: payload.password, user_metadata: { must_change_password: true } }) });
    if (!response.ok) return NextResponse.json({ error: "Could not set the temporary password." }, { status: response.status });
    await fetch(`${context.url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(payload.userId)}`, { method: "DELETE", headers: headers(context.serviceKey) });
  } else if (payload.action === "force-password-change") {
    const userResponse = await fetch(authUrl, { headers: headers(context.serviceKey), cache: "no-store" });
    const current = await userResponse.json().catch(() => null) as AdminUser | null;
    if (!userResponse.ok) return NextResponse.json({ error: "Could not load the authentication user." }, { status: userResponse.status });
    const response = await fetch(authUrl, { method: "PUT", headers: headers(context.serviceKey), body: JSON.stringify({ user_metadata: { ...(current?.user_metadata || {}), must_change_password: true } }) });
    if (!response.ok) return NextResponse.json({ error: "Could not require a password change." }, { status: response.status });
    await fetch(`${context.url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(payload.userId)}`, { method: "DELETE", headers: headers(context.serviceKey) });
  } else if (payload.action === "close-session") {
    await fetch(`${context.url}/rest/v1/active_sessions?user_id=eq.${encodeURIComponent(payload.userId)}`, { method: "DELETE", headers: headers(context.serviceKey) });
  }
  await writeAudit(context, payload.action, payload.userId, { administrator: context.actor });
  return NextResponse.json({ ok: true });
}
