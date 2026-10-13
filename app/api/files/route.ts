import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { can, normalizeRole } from "../../../lib/security";

const bucket = "uccw-files";
const allowedModules = new Set(["clients", "settings"]);
const safePath = (value: string) => value && !value.includes("..") && /^[a-zA-Z0-9_./-]+$/.test(value);

async function session(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value; const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const accessToken = verified.payload.accessToken; return typeof accessToken === "string" ? { url: url.replace(/\/$/, ""), key, accessToken, role: normalizeRole(verified.payload.role), email: String(verified.payload.email || "Unknown user"), userId: typeof verified.payload.userId === "string" ? verified.payload.userId : null } : null; } catch { return null; }
}
function headers(key: string, accessToken: string, contentType?: string) { return { apikey: key, Authorization: `Bearer ${accessToken}`, ...(contentType ? { "Content-Type": contentType } : {}) }; }
async function logDownload(current: NonNullable<Awaited<ReturnType<typeof session>>>, path: string) { const module = path.startsWith("settings/") ? "configuration" : "clients"; const data = { id: crypto.randomUUID(), action: "download", module, resource: "files", recordId: path.split("/")[1] || null, actor: current.email, actorUserId: current.userId, role: current.role, details: { path }, createdAt: new Date().toISOString() }; await fetch(`${current.url}/rest/v1/audit_logs`, { method: "POST", headers: { ...headers(current.key, current.accessToken, "application/json"), Prefer: "return=minimal" }, body: JSON.stringify({ id: data.id, action: "download", module, resource: "files", record_id: data.recordId, actor_email: current.email, actor_user_id: current.userId, data }) }).catch(() => null); }

export async function POST(request: NextRequest) {
  const current = await session(request); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = await request.formData(); const file = data.get("file"); const module = String(data.get("module") || ""); const recordId = String(data.get("recordId") || "");
  const permissionModule = module === "settings" ? "configuration" : "clients";
  if (!can(current.role, permissionModule, "write")) return NextResponse.json({ error: "Su rol no permite cargar documentos." }, { status: 403 });
  if (!(file instanceof File) || !allowedModules.has(module) || !/^[a-f0-9-]{20,}$/i.test(recordId) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Archivo no válido o supera el límite de 10 MB" }, { status: 400 });
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "archivo"; const path = `${module}/${recordId}/${crypto.randomUUID()}-${fileName}`;
  const response = await fetch(`${current.url}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: headers(current.key, current.accessToken, file.type || "application/octet-stream"), body: file });
  if (!response.ok) { const detail = await response.json().catch(() => null) as { message?: string; error?: string } | null; const reason = detail?.message || detail?.error; const message = response.status === 401 ? "La sesión de Supabase venció. Cierre sesión e ingrese nuevamente." : response.status === 403 ? "Supabase rechazó la carga. Verifique las políticas INSERT del bucket uccw-files." : response.status === 404 ? "El bucket uccw-files no existe en este proyecto de Supabase." : response.status === 413 ? "El archivo supera el límite permitido de 10 MB." : reason || `Supabase Storage respondió con el error ${response.status}.`; return NextResponse.json({ error: message }, { status: response.status }); }
  return NextResponse.json({ path });
}

export async function GET(request: NextRequest) {
  const current = await session(request); const path = new URL(request.url).searchParams.get("path") || ""; if (!current || !safePath(path)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const permissionModule = path.startsWith("settings/") ? "configuration" : "clients";
  if (!can(current.role, permissionModule, "download")) return NextResponse.json({ error: "Su rol no permite descargar documentos." }, { status: 403 });
  const response = await fetch(`${current.url}/storage/v1/object/authenticated/${bucket}/${path}`, { headers: headers(current.key, current.accessToken) });
  if (!response.ok || !response.body) return NextResponse.json({ error: "Archivo no encontrado" }, { status: response.status || 404 });
  await logDownload(current, path); return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "application/octet-stream", "Content-Disposition": response.headers.get("Content-Disposition") || "inline", "Cache-Control": "private, max-age=300" } });
}
