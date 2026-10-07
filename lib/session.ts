import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSession() {
  const token = (await cookies()).get("uccw_session")?.value;
  const secret = process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026";
  if (!token) redirect("/login");

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    redirect("/login");
  }
}
