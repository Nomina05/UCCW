import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, Module } from "./security";
import { resolveProfileAccess } from "./profile-role";

export async function requireSession(module?: Module) {
  const token = (await cookies()).get("uccw_session")?.value;
  const secret = process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026";
  if (!token) redirect("/login");

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    const access = await resolveProfileAccess(verified.payload);
    if (module && !can(access.role, module, "read", access.permissions)) redirect("/dashboard?forbidden=1");
  } catch {
    redirect("/login");
  }
}

