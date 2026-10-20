import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { can } from "../../../../lib/security";
import { resolveProfileAccess } from "../../../../lib/profile-role";

type Payload = { channel?: "email" | "sms"; recipient?: string; subject?: string; body?: string };

export async function POST(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value;
  const verified = token ? await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")).catch(() => null) : null;
  if (!verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = await resolveProfileAccess(verified.payload);
  if (!can(access.role, "communications", "write", access.permissions)) return NextResponse.json({ error: "Your account cannot send communications." }, { status: 403 });
  const payload = await request.json() as Payload; const recipient = String(payload.recipient || "").trim(); const body = String(payload.body || "").trim();
  if (!recipient || !body || !["email", "sms"].includes(payload.channel || "")) return NextResponse.json({ error: "Recipient, channel, and message are required." }, { status: 400 });
  if (payload.channel === "email") {
    const key = process.env.RESEND_API_KEY; const from = process.env.COMMUNICATIONS_FROM_EMAIL;
    if (!key || !from) return NextResponse.json({ error: "Email delivery is not configured. Add RESEND_API_KEY and COMMUNICATIONS_FROM_EMAIL in Vercel." }, { status: 503 });
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [recipient], subject: payload.subject || "UCCW", text: body }) });
    const result = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) return NextResponse.json({ error: result?.message || "Email delivery failed." }, { status: response.status });
    return NextResponse.json({ provider: "resend", providerId: result?.id || "", sentAt: new Date().toISOString() });
  }
  const sid = process.env.TWILIO_ACCOUNT_SID; const secret = process.env.TWILIO_AUTH_TOKEN; const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !secret || !from) return NextResponse.json({ error: "SMS delivery is not configured. Add the Twilio credentials in Vercel." }, { status: 503 });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${sid}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: recipient, From: from, Body: body }) });
  const result = await response.json().catch(() => null) as { sid?: string; message?: string } | null;
  if (!response.ok) return NextResponse.json({ error: result?.message || "SMS delivery failed." }, { status: response.status });
  return NextResponse.json({ provider: "twilio", providerId: result?.sid || "", sentAt: new Date().toISOString() });
}
