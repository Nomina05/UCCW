import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { can } from "../../../lib/security";
import { resolveProfileAccess } from "../../../lib/profile-role";

const bucket = "uccw-files";
const allowedModules = new Set(["clients", "settings"]);
const safePath = (value: string) => value && !value.includes("..") && /^[a-zA-Z0-9_./-]+$/.test(value);
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"]);
function signatureAllowed(bytes: Uint8Array, extension: string) { const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value); if (extension === "pdf") return starts(0x25, 0x50, 0x44, 0x46); if (["jpg", "jpeg"].includes(extension)) return starts(0xff, 0xd8, 0xff); if (extension === "png") return starts(0x89, 0x50, 0x4e, 0x47); if (extension === "webp") return starts(0x52, 0x49, 0x46, 0x46) && bytes.slice(8, 12).every((value, index) => value === [0x57, 0x45, 0x42, 0x50][index]); if (extension === "doc") return starts(0xd0, 0xcf, 0x11, 0xe0); if (extension === "docx") return starts(0x50, 0x4b, 0x03, 0x04); return false; }

async function session(request: NextRequest) {
  const token = request.cookies.get("uccw_session")?.value; const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const accessToken = verified.payload.accessToken; if (typeof accessToken !== "string") return null; return { url: url.replace(/\/$/, ""), key, accessToken, ...(await resolveProfileAccess(verified.payload)), email: String(verified.payload.email || "Unknown user"), userId: typeof verified.payload.userId === "string" ? verified.payload.userId : null }; } catch { return null; }
}
function headers(key: string, accessToken: string, contentType?: string) { return { apikey: key, Authorization: `Bearer ${accessToken}`, ...(contentType ? { "Content-Type": contentType } : {}) }; }
async function logDownload(current: NonNullable<Awaited<ReturnType<typeof session>>>, path: string) { const module = path.startsWith("settings/") ? "configuration" : "clients"; const data = { id: crypto.randomUUID(), action: "download", module, resource: "files", recordId: path.split("/")[1] || null, actor: current.email, actorUserId: current.userId, role: current.role, details: { path }, createdAt: new Date().toISOString() }; await fetch(`${current.url}/rest/v1/audit_logs`, { method: "POST", headers: { ...headers(current.key, current.accessToken, "application/json"), Prefer: "return=minimal" }, body: JSON.stringify({ id: data.id, action: "download", module, resource: "files", record_id: data.recordId, actor_email: current.email, actor_user_id: current.userId, data }) }).catch(() => null); }

export async function POST(request: NextRequest) {
  const current = await session(request); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const data = await request.formData(); const file = data.get("file"); const module = String(data.get("module") || ""); const recordId = String(data.get("recordId") || "");
  const permissionModule = module === "settings" ? "configuration" : "clients";
  if (!can(current.role, permissionModule, "write", current.permissions)) return NextResponse.json({ error: "Su usuario no permite cargar documentos." }, { status: 403 });
  const maxSizeMb = Math.min(Math.max(Number(process.env.MAX_DOCUMENT_SIZE_MB) || 10, 1), 25); const extension = file instanceof File ? file.name.split(".").pop()?.toLowerCase() || "" : "";
  if (!(file instanceof File) || !allowedModules.has(module) || !/^[a-f0-9-]{20,}$/i.test(recordId) || file.size > maxSizeMb * 1024 * 1024) return NextResponse.json({ error: `Invalid file or exceeds the ${maxSizeMb} MB limit.` }, { status: 400 });
  if (!allowedTypes.has(file.type) || !allowedExtensions.has(extension)) return NextResponse.json({ error: "File type not allowed. Use PDF, JPG, PNG, WEBP, DOC, or DOCX." }, { status: 415 });
  const firstBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer()); if (!signatureAllowed(firstBytes, extension)) return NextResponse.json({ error: "The file content does not match its extension and was rejected as potentially unsafe." }, { status: 415 });
  const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "archivo"; const path = `${module}/${recordId}/${crypto.randomUUID()}-${fileName}`;
  const response = await fetch(`${current.url}/storage/v1/object/${bucket}/${path}`, { method: "POST", headers: headers(current.key, current.accessToken, file.type || "application/octet-stream"), body: file });
  if (!response.ok) { const detail = await response.json().catch(() => null) as { message?: string; error?: string } | null; const reason = detail?.message || detail?.error; const message = response.status === 401 ? "La sesión de Supabase venció. Cierre sesión e ingrese nuevamente." : response.status === 403 ? "Supabase rechazó la carga. Verifique las políticas INSERT del bucket uccw-files." : response.status === 404 ? "El bucket uccw-files no existe en este proyecto de Supabase." : response.status === 413 ? "El archivo supera el límite permitido de 10 MB." : reason || `Supabase Storage respondió con el error ${response.status}.`; return NextResponse.json({ error: message }, { status: response.status }); }
  return NextResponse.json({ path });
}

export async function GET(request: NextRequest) {
  const current = await session(request); const path = new URL(request.url).searchParams.get("path") || ""; if (!current || !safePath(path)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const permissionModule = path.startsWith("settings/") ? "configuration" : "clients";
  if (!can(current.role, permissionModule, "download", current.permissions)) return NextResponse.json({ error: "Su usuario no permite descargar documentos." }, { status: 403 });
  const response = await fetch(`${current.url}/storage/v1/object/authenticated/${bucket}/${path}`, { headers: headers(current.key, current.accessToken) });
  if (!response.ok || !response.body) return NextResponse.json({ error: "Archivo no encontrado" }, { status: response.status || 404 });
  await logDownload(current, path); return new NextResponse(response.body, { headers: { "Content-Type": response.headers.get("Content-Type") || "application/octet-stream", "Content-Disposition": response.headers.get("Content-Disposition") || "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'" } });
}
