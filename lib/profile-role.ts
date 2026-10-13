import { JWTPayload } from "jose";
import { ModulePermissions, normalizePermissions, normalizeRole, Role } from "./security";

export type ProfileAccess = { role: Role; permissions: ModulePermissions | null };

/** Resolve the current role from Supabase so an old JWT cannot retain stale permissions. */
export async function resolveProfileRole(payload: JWTPayload): Promise<Role> {
  return (await resolveProfileAccess(payload)).role;
}

/** Resolve current role and per-user overrides so stale JWT data cannot grant access. */
export async function resolveProfileAccess(payload: JWTPayload): Promise<ProfileAccess> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const fallback = { role: normalizeRole(payload.role), permissions: normalizePermissions(payload.permissions) };
  if (!url || !key || !accessToken || !userId) return fallback;
  try {
    const response = await fetch(`${url}/rest/v1/profiles?select=profile,permissions&id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) return fallback;
    const rows = await response.json() as { profile?: string; permissions?: unknown }[];
    return { role: normalizeRole(rows[0]?.profile || payload.role), permissions: normalizePermissions(rows[0]?.permissions) };
  } catch { return fallback; }
}
