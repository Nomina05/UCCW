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
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || demoEmail;
  const configuredPassword = process.env.ADMIN_PASSWORD || demoPassword;
  const sessionSecret = process.env.SESSION_SECRET || demoSessionSecret;

  if (email !== configuredEmail || password !== configuredPassword) {
    redirect("/login?error=1");
  }

  const token = await new SignJWT({ email })
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
