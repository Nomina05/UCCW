import { JWTPayload } from "jose";
import { normalizeRole, Role } from "./security";

/** Resolve the current role from Supabase so an old JWT cannot retain stale permissions. */
export async function resolveProfileRole(payload: JWTPayload): Promise<Role> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY;
  const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  if (!url || !key || !accessToken || !userId) return normalizeRole(payload.role);
  try {
    const response = await fetch(`${url}/rest/v1/profiles?select=profile&id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) return normalizeRole(payload.role);
    const rows = await response.json() as { profile?: string }[];
    return normalizeRole(rows[0]?.profile || payload.role);
  } catch { return normalizeRole(payload.role); }
}
