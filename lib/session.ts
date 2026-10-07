import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireSession() {
  const token = (await cookies()).get("uccw_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) redirect("/login");

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    redirect("/login");
  }
}
