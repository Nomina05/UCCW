"use server";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const secret = process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026";

export async function changeInitialPassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (password !== confirmation) redirect("/cambiar-clave?error=mismatch");
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) redirect("/cambiar-clave?error=weak");
  const cookieStore = await cookies(); const token = cookieStore.get("uccw_session")?.value;
  if (!token) redirect("/login");
  const verified = await jwtVerify(token, new TextEncoder().encode(secret)).catch(() => null);
  if (!verified) redirect("/login");
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY; const accessToken = verified.payload.accessToken;
  if (!url || !key || typeof accessToken !== "string") redirect("/login");
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password, data: { must_change_password: false } }), cache: "no-store" });
  if (!response.ok) redirect("/cambiar-clave?error=save");
  const renewed = await new SignJWT({ ...verified.payload, mustChangePassword: false }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(new TextEncoder().encode(secret));
  cookieStore.set("uccw_session", renewed, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/" });
  redirect("/dashboard?passwordChanged=1");
}
