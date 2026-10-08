"use server";

import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const encoder = new TextEncoder();
const demoEmail = "demo@uccw.local";
const demoPassword = "UccwDemo2026!";
const demoSessionSecret = "uccw-demo-session-only-not-for-production-2026";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const sessionSecret = process.env.SESSION_SECRET || demoSessionSecret;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  let userId: string | undefined;

  if (supabaseUrl && supabaseAnonKey) {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: supabaseAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => null) as { user?: { id?: string } } | null;
    if (!response.ok || !result?.user?.id) redirect("/login?error=1");
    userId = result.user.id;
  } else {
    const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || demoEmail;
    const configuredPassword = process.env.ADMIN_PASSWORD || demoPassword;
    if (email !== configuredEmail || password !== configuredPassword) redirect("/login?error=1");
  }

  const token = await new SignJWT({ email, userId, provider: userId ? "supabase" : "demo" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(encoder.encode(sessionSecret));

  const cookieStore = await cookies();
  cookieStore.set("uccw_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/"
  });
  redirect("/dashboard");
}
