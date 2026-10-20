"use server";

import { redirect } from "next/navigation";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY;
  if (url && key && email) {
    const siteUrl = (process.env.APP_URL || "https://uccw.vercel.app").replace(/\/$/, "");
    await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${siteUrl}/restablecer-clave`)}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email }), cache: "no-store" }).catch(() => null);
  }
  redirect("/recuperar-clave?sent=1");
}
