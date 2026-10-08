import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const bucket = "uccw-files";
const allowedModules = new Set(["clients"]);
const safePath = (value: string) => value && !value.includes("..") && /^[a-zA-Z0-9_./-]+$/.test(value);

async function session(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value; const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const accessToken = verified.payload.accessToken; return typeof accessToken === "string" ? { url: url.replace(/\/$/, ""), key, accessToken } : null; } catch { return null; }
}
function headers(key: string, accessToken: string, contentType?: string) { return { apikey: key, Authorization: `Bearer ${accessToken}`, ...(contentType ? { "Content-Type": contentType } : {}) }; }

export async function POST(request: NextRequest) {
  const current = await session(request); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = await request.formData(); const file = data.get("file"); const module = String(data.get("module") || ""); const recordId = String(data.get("recordId") || "");
  if (!(file instanceof File) || !allowedModules.has(module) || !/^[a-f0-9-]{20,}$/i.test(recordId) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Archivo no válido o supera el límite de 10 MB" }, { status: 400 });
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "archivo"; const path = `${module}/${recordId}/${crypto.randomUUID()}-${fileName}`;
  const response = await fetch(`${current.url}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: headers(current.key, current.accessToken, file.type || "application/octet-stream"), body: file });
  if (!response.ok) return NextResponse.json({ error: "No fue posible guardar el archivo. Verifique que la migración de Storage esté aplicada." }, { status: response.status });
  return NextResponse.json({ path });
}

export async function GET(request: NextRequest) {
  const current = await session(request); const path = new URL(request.url).searchParams.get("path") || ""; if (!current || !safePath(path)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const response = await fetch(`${current.url}/storage/v1/object/authenticated/${bucket}/${path}`, { headers: headers(current.key, current.accessToken) });
  if (!response.ok || !response.body) return NextResponse.json({ error: "Archivo no encontrado" }, { status: response.status || 404 });
  return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "application/octet-stream", "Content-Disposition": response.headers.get("Content-Disposition") || "inline", "Cache-Control": "private, max-age=300" } });
}
