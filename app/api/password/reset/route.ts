import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ""); const key = process.env.SUPABASE_ANON_KEY;
  const body = await request.json().catch(() => null) as { accessToken?: string; password?: string } | null;
  if (!url || !key || !body?.accessToken || !body.password || body.password.length < 8 || !/[a-z]/.test(body.password) || !/[A-Z]/.test(body.password) || !/\d/.test(body.password)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const response = await fetch(`${url}/auth/v1/user`, { method: "PUT", headers: { apikey: key, Authorization: `Bearer ${body.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ password: body.password, data: { must_change_password: false } }), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Invalid or expired recovery link" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
