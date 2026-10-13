import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { resolveProfileAccess } from "../../../lib/profile-role";

export async function GET(request: NextRequest) { const token = request.cookies.get("uccw_session")?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const access = await resolveProfileAccess(verified.payload); return NextResponse.json({ authenticated: true, ...access, email: verified.payload.email }); } catch { return NextResponse.json({ authenticated: false }, { status: 401 }); } }

export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set("uccw_session", "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" }); return response; }

