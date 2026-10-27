import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { can, Module, normalizePermissions, normalizeRole } from "../../../../lib/security";
import { resolveProfileAccess } from "../../../../lib/profile-role";
import { incompleteFields, normalizeDataRecord, requiredFields, validateDataRecord } from "../../../../lib/data-quality";

type Resource = "clients" | "client-services" | "cases" | "calendar-events" | "communications" | "communication-templates" | "report-goals" | "donors" | "volunteers" | "food" | "clothing" | "users" | "audit" | "training" | "settings";
type StoredRecord = Record<string, unknown> & { id?: string; clientId?: string; donorId?: string; volunteerId?: string; fullName?: string; firstName?: string; lastName?: string; date?: string; address?: string; children?: string; adults?: string; seniors?: string; totalHousehold?: string; createdAt?: string };

function hasContent(value: unknown) { return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null; }
function mergeClientRecord(existing: StoredRecord, incoming: StoredRecord) {
  const merged: StoredRecord = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (["legacyData", "legacySources", "id", "createdAt", "createdBy", "createdByUserId", "updatedAt", "updatedBy", "updatedByUserId"].includes(key)) continue;
    if (typeof value === "boolean") merged[key] = Boolean(merged[key]) || value;
    else if (Array.isArray(value)) merged[key] = Array.from(new Set([...(Array.isArray(merged[key]) ? merged[key] as unknown[] : []), ...value].filter(hasContent)));
    else if (hasContent(value)) merged[key] = value;
  }
  const sources = [...(Array.isArray(existing.legacySources) ? existing.legacySources : []), existing.legacyData, ...(Array.isArray(incoming.legacySources) ? incoming.legacySources : []), incoming.legacyData].filter(hasContent);
  const seen = new Set<string>(); merged.legacySources = sources.filter((source) => { const key = JSON.stringify(source); if (seen.has(key)) return false; seen.add(key); return true; });
  merged.legacyData = incoming.legacyData || existing.legacyData; merged.id = existing.id || incoming.id; merged.createdAt = existing.createdAt || incoming.createdAt; merged.createdBy = existing.createdBy || incoming.createdBy; merged.createdByUserId = existing.createdByUserId || incoming.createdByUserId;
  return merged;
}

const resources: Record<Resource, { table: string; module: Module; serviceType?: string; row: (record: StoredRecord) => Record<string, unknown> }> = {
  clients: { table: "clients", module: "clients", row: (record) => ({ id: record.id, client_number: record.clientId, full_name: record.fullName, service_date: record.serviceDate || null, data: record }) },
  "client-services": { table: "client_services", module: "services", row: (record) => ({ id: record.id, client_id: record.clientId, client_name: record.clientName, service_category: record.serviceCategory, subservice: record.subservice || null, requested_date: record.requestedDate || null, service_status: record.status || "Requested", assigned_to: record.assignedTo || null, follow_up_date: record.followUpDate || null, completion_date: record.completionDate || null, comments: record.comments || null, documents: Array.isArray(record.documents) ? record.documents : [], data: record }) },
  cases: { table: "case_control", module: "cases", row: (record) => ({ id: record.id, case_number: record.caseNumber, client_name: record.clientName || null, case_status: record.status || "Abierto", assigned_to: record.assignedTo || null, follow_up_date: record.followUpDate || null, data: record }) },
  "calendar-events": { table: "calendar_events", module: "agenda", row: (record) => ({ id: record.id, event_date: record.date, event_type: record.type || "event", title: record.title, assigned_to: record.assignedTo || null, data: record }) },
  communications: { table: "communications", module: "communications", row: (record) => ({ id: record.id, client_id: record.clientId || null, channel: record.channel, recipient: record.recipient, subject: record.subject || null, delivery_status: record.status || "Draft", scheduled_at: record.scheduledAt || null, sent_at: record.sentAt || null, data: record }) },
  "communication-templates": { table: "communication_templates", module: "communications", row: (record) => ({ id: record.id, template_name: record.name, channel: record.channel || "email", language: record.language || "en", data: record }) },
  "report-goals": { table: "report_goals", module: "reports", row: (record) => ({ id: record.id, goal_month: record.month, metric: record.metric, target_value: Number(record.target) || 0, data: record }) },
  users: { table: "user_records", module: "users", row: (record) => ({ id: record.id, email: record.email, profile: record.profile || null, active: record.active === "Yes", data: record }) },
  donors: { table: "donors", module: "donors", row: (record) => ({ id: record.id, donor_number: record.donorId, first_name: record.firstName, last_name: record.lastName, donation_date: record.date || null, amount: record.amount || null, data: record }) },
  volunteers: { table: "volunteers", module: "volunteers", row: (record) => ({ id: record.id, volunteer_number: record.volunteerId, first_name: record.firstName, last_name: record.lastName, status: record.status || "Active", volunteer_date: record.date || null, data: record }) },
  food: { table: "service_records", module: "services", serviceType: "food_distribution", row: (record) => ({ id: record.id, service_type: "food_distribution", service_date: record.date, full_name: record.fullName, address: record.address || null, children: Number(record.children) || 0, adults: Number(record.adults) || 0, seniors: Number(record.seniors) || 0, total_household: [record.children, record.adults, record.seniors].reduce((sum, value) => sum + (Number(value) || 0), 0), data: record }) },
  clothing: { table: "service_records", module: "services", serviceType: "clothing_drive", row: (record) => ({ id: record.id, service_type: "clothing_drive", service_date: record.date, full_name: record.fullName, total_household: Number(record.totalHousehold) || 0, data: record }) },
  audit: { table: "audit_logs", module: "audit", row: (record) => ({ id: record.id, data: record }) },
  training: { table: "training_records", module: "training", row: (record) => ({ id: record.id, title: record.title, start_date: record.startDate || null, status: record.status || "Planned", instructor: record.instructor || null, data: record }) },
  settings: { table: "institution_settings", module: "configuration", row: (record) => ({ id: record.id, organization_name: String((record.organization as { name?: unknown } | undefined)?.name || "UCCW"), data: record }) }
};

function resourceFrom(value: string): Resource | null { return Object.prototype.hasOwnProperty.call(resources, value) ? value as Resource : null; }
async function context(request: NextRequest, resourceName: string) {
  const resource = resourceFrom(resourceName); const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY; const token = request.cookies.get("uccw_session")?.value;
  if (!resource || !url || !key || !token) return null;
  try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const accessToken = verified.payload.accessToken; const email = typeof verified.payload.email === "string" ? verified.payload.email : "Usuario no identificado"; const userId = typeof verified.payload.userId === "string" ? verified.payload.userId : undefined; if (typeof accessToken !== "string") return null; const access = await resolveProfileAccess(verified.payload); return { resource: resources[resource], url: url.replace(/\/$/, ""), key, accessToken, ...access, actor: { email, userId } }; } catch { return null; }
}
function headers(key: string, accessToken: string, extra: Record<string, string> = {}) { return { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...extra }; }
async function audit(current: NonNullable<Awaited<ReturnType<typeof context>>>, action: string, resource: string, recordId?: string, details: Record<string, unknown> = {}) { const data = { id: crypto.randomUUID(), action, module: current.resource.module, resource, recordId, actor: current.actor.email, actorUserId: current.actor.userId, role: current.role, details, createdAt: new Date().toISOString() }; await fetch(`${current.url}/rest/v1/audit_logs`, { method: "POST", headers: headers(current.key, current.accessToken, { Prefer: "return=minimal" }), body: JSON.stringify({ id: data.id, action, module: current.resource.module, resource, record_id: recordId || null, actor_email: current.actor.email, actor_user_id: current.actor.userId || null, data }) }).catch(() => null); }
async function synchronizationFailure(current: NonNullable<Awaited<ReturnType<typeof context>>>, resource: string, operation: string, error: string) { await fetch(`${current.url}/rest/v1/continuity_events`, { method: "POST", headers: headers(current.key, current.accessToken, { Prefer: "return=minimal" }), body: JSON.stringify({ event_type: "synchronization", resource, status: "failed", actor_email: current.actor.email, details: { operation, error } }) }).catch(() => null); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!can(current.role, current.resource.module, "read", current.permissions)) return NextResponse.json({ error: "Su usuario no tiene permiso para consultar este módulo." }, { status: 403 });
  const requestUrl = new URL(request.url); const search = requestUrl.searchParams.get("q")?.trim().slice(0, 120) || ""; const pageNumber = Math.max(Number(requestUrl.searchParams.get("page")) || 1, 1); const envelope = name === "clients" && requestUrl.searchParams.has("page");
  const from = requestUrl.searchParams.get("from") || ""; const to = requestUrl.searchParams.get("to") || ""; const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value); const dateFilter = name === "clients" ? `${validDate(from) ? `&service_date=gte.${from}` : ""}${validDate(to) ? `&service_date=lte.${to}` : ""}` : "";
  const clientId = requestUrl.searchParams.get("clientId")?.trim() || ""; const ids = (requestUrl.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100); const deleted = requestUrl.searchParams.get("deleted") === "only"; if (deleted && !["Administrator", "Supervisor"].includes(current.role)) return NextResponse.json({ error: "No autorizado para consultar la papelera." }, { status: 403 }); const deletedFilter = name === "audit" ? "" : deleted ? "&deleted_at=not.is.null" : "&deleted_at=is.null"; const resourceFilter = current.resource.serviceType ? `&service_type=eq.${current.resource.serviceType}` : name === "client-services" && clientId ? `&client_id=eq.${encodeURIComponent(clientId)}` : ids.length ? `&id=in.(${ids.join(",")})` : ""; const filter = `${resourceFilter}${deletedFilter}`;
  // Cada respuesta se mantiene acotada. Los clientes grandes se leen por páginas
  // desde el navegador para no superar el tiempo/límite de tamaño de una función.
  const requestedLimit = Number(requestUrl.searchParams.get("limit"));
  const requestedOffset = envelope ? (pageNumber - 1) * requestedLimit : Number(requestUrl.searchParams.get("offset"));
  const pageSize = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 1000) : 1000;
  const startOffset = Number.isFinite(requestedOffset) ? Math.max(Math.floor(requestedOffset), 0) : 0;
  const pagedRequest = requestUrl.searchParams.has("limit") || requestUrl.searchParams.has("offset") || envelope;
  const rows: { data?: StoredRecord; id: string; created_at: string; client_number?: string }[] = [];
  let total = 0;

  for (let offset = startOffset; offset < 50000; offset += pageSize) {
    const clientSelect = name === "clients" ? ",client_number" : "";
    const searchFilter = name === "clients" && search ? `&or=(${encodeURIComponent(`full_name.ilike.*${search}*,client_number.ilike.*${search}*,data->>city.ilike.*${search}*,data->>email.ilike.*${search}*,data->>phone.ilike.*${search}*,data->>last4Ssn.ilike.*${search}*`)})` : "";
    const requestHeaders = headers(current.key, current.accessToken, envelope ? { Prefer: "count=exact" } : {}); let response = await fetch(`${current.url}/rest/v1/${current.resource.table}?select=id,data,created_at${clientSelect}${name === "audit" ? "" : ",deleted_at,deleted_by"}&order=created_at.desc,id.desc&limit=${pageSize}&offset=${offset}${filter}${searchFilter}${dateFilter}`, { headers: requestHeaders, cache: "no-store" });
    if (!response.ok && name !== "audit" && !deleted) { const detail = await response.clone().json().catch(() => null) as { message?: string } | null; if (detail?.message?.includes("deleted_at") || detail?.message?.includes("deleted_by")) response = await fetch(`${current.url}/rest/v1/${current.resource.table}?select=id,data,created_at${clientSelect}&order=created_at.desc,id.desc&limit=${pageSize}&offset=${offset}${resourceFilter}${searchFilter}${dateFilter}`, { headers: requestHeaders, cache: "no-store" }); }
    if (!response.ok) { const detail = await response.json().catch(() => null) as { message?: string } | null; const message = deleted ? "La migración de seguridad aún no está aplicada en Supabase." : detail?.message || "No fue posible leer los registros"; await synchronizationFailure(current, name, "read", message); return NextResponse.json({ error: message }, { status: response.status }); }
    if (envelope) total = Number(response.headers.get("content-range")?.split("/")[1]) || 0;
    const page = await response.json() as { data?: StoredRecord; id: string; created_at: string }[];
    rows.push(...page);
    if (pagedRequest || page.length < pageSize) break;
  }

  const records = rows.map((row) => { const record = normalizeDataRecord({ ...row.data, id: row.data?.id || row.id, clientId: name === "clients" ? row.client_number || row.data?.clientId : row.data?.clientId, createdAt: row.data?.createdAt || row.created_at, deletedAt: (row as typeof row & { deleted_at?: string }).deleted_at, deletedBy: (row as typeof row & { deleted_by?: string }).deleted_by }); return name === "audit" ? record : { ...record, qualityIssues: incompleteFields(name, record) }; });
  return NextResponse.json(envelope ? { records, total } : records);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (name === "audit" || !can(current.role, current.resource.module, "write", current.permissions)) return NextResponse.json({ error: "Su usuario no tiene permiso para modificar este módulo." }, { status: 403 });
  const payload = await request.json() as { record?: StoredRecord; records?: StoredRecord[]; password?: string; skipExisting?: boolean; mergeExisting?: boolean }; let records = payload.records || (payload.record ? [payload.record] : []);
  if (!records.length || records.length > 250 || records.some((record) => !record.id)) return NextResponse.json({ error: "Registro inválido" }, { status: 400 });
  if (payload.mergeExisting && name === "clients") {
    const consolidated = new Map<string, StoredRecord>();
    for (const record of records) { const prior = consolidated.get(record.clientId || ""); consolidated.set(record.clientId || "", prior ? mergeClientRecord(prior, record) : record); }
    records = [...consolidated.values()];
    const clientNumbers = [...new Set(records.map((record) => record.clientId).filter((value): value is string => typeof value === "string" && value.length > 0))];
    const query = new URLSearchParams({ select: "id,client_number,data", client_number: `in.(${clientNumbers.join(",")})` });
    const existingResponse = await fetch(`${current.url}/rest/v1/clients?${query.toString()}`, { headers: headers(current.key, current.accessToken), cache: "no-store" });
    if (!existingResponse.ok) return NextResponse.json({ error: "No fue posible consolidar los registros existentes" }, { status: existingResponse.status });
    const existingRows = await existingResponse.json() as { id: string; client_number?: string; data?: StoredRecord }[]; const existing = new Map(existingRows.map((row) => [row.client_number, { ...row.data, id: row.id }]));
    records = records.map((record) => existing.get(record.clientId || "") ? mergeClientRecord(existing.get(record.clientId || "")!, record) : record);
  }
  const configuredRequired = process.env[`REQUIRED_FIELDS_${name.replace(/-/g, "_").toUpperCase()}`]; const required = requiredFields(name, configuredRequired);
  records = records.map((record) => { const normalized = normalizeDataRecord(record); return { ...normalized, qualityIssues: incompleteFields(name, normalized) }; });
  const invalid = records.map((record, index) => ({ index: index + 1, id: record.id, errors: validateDataRecord(name, record, required) })).filter((item) => item.errors.length);
  if (invalid.length) return NextResponse.json({ error: `${invalid.length} registro(s) no cumplen las reglas de calidad.`, rejected: invalid }, { status: 422 });
  if (name === "clients" && records.length === 1 && !payload.mergeExisting) {
    const candidate = records[0]; const fullName = String(candidate.fullName || "").trim(); const phone = String(candidate.phone || "").replace(/\D/g, ""); const birth = String(candidate.dateOfBirth || "");
    if (fullName) {
      const duplicateQuery = new URLSearchParams({ select: "id,client_number,data", full_name: `eq.${fullName}`, limit: "20" });
      const duplicateResponse = await fetch(`${current.url}/rest/v1/clients?${duplicateQuery.toString()}`, { headers: headers(current.key, current.accessToken), cache: "no-store" });
      if (duplicateResponse.ok) {
        const matches = await duplicateResponse.json() as { id: string; client_number?: string; data?: StoredRecord }[];
        const duplicate = matches.find((row) => row.id !== candidate.id && ((phone && String(row.data?.phone || "").replace(/\D/g, "") === phone) || (birth && String(row.data?.dateOfBirth || "") === birth)));
        if (duplicate) return NextResponse.json({ error: `Posible cliente duplicado (${duplicate.client_number || duplicate.id}). Revise o combine el expediente existente.` }, { status: 409 });
      }
    }
  }
  if (name === "users" && records.length === 1 && payload.password) {
    const record = records[0]; const email = String(record.email || "").trim().toLowerCase();
    const profileLookup = await fetch(`${current.url}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`, { headers: headers(current.key, current.accessToken), cache: "no-store" });
    const existingProfiles = profileLookup.ok ? await profileLookup.json() as { id: string }[] : [];
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel. La cuenta no puede activarse de forma segura en Supabase Auth." }, { status: 503 });
    const existingId = existingProfiles[0]?.id;
    const authUrl = existingId ? `${current.url}/auth/v1/admin/users/${encodeURIComponent(existingId)}` : `${current.url}/auth/v1/admin/users`;
    const authResponse = await fetch(authUrl, { method: existingId ? "PUT" : "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: payload.password, email_confirm: true, user_metadata: { name: record.name, firstname: record.firstName, must_change_password: true } }), cache: "no-store" });
    const authResult = await authResponse.json().catch(() => null) as { id?: string; user?: { id?: string }; msg?: string; message?: string } | null;
    const authId = existingId || authResult?.user?.id || authResult?.id;
    if (!authResponse.ok || !authId) return NextResponse.json({ error: authResult?.msg || authResult?.message || "No fue posible crear o actualizar la cuenta en Supabase Auth." }, { status: authResponse.status || 400 });
    records[0] = { ...record, id: authId };
    const newProfile = { id: authId, profile: normalizeRole(record.profile), name: String(record.name || ""), firstname: String(record.firstName || ""), email, active: record.active === "Yes", permissions: normalizePermissions(record.permissions) };
    const profileResponse = await fetch(`${current.url}/rest/v1/profiles?on_conflict=id`, { method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(newProfile) });
    if (!profileResponse.ok) { const detail = await profileResponse.json().catch(() => null) as { message?: string } | null; return NextResponse.json({ error: detail?.message || "La cuenta fue creada, pero no fue posible guardar su perfil y permisos." }, { status: profileResponse.status }); }
  }
  const ids = records.map((record) => String(record.id)); if (new Set(ids).size !== ids.length) return NextResponse.json({ error: "La solicitud contiene identificadores duplicados." }, { status: 409 });
  const auditedAt = new Date().toISOString();
  records = records.map((record) => ({ ...record, createdBy: typeof record.createdBy === "string" && record.createdBy ? record.createdBy : current.actor.email, createdByUserId: typeof record.createdByUserId === "string" && record.createdByUserId ? record.createdByUserId : current.actor.userId, updatedBy: current.actor.email, updatedByUserId: current.actor.userId, updatedAt: auditedAt }));
  const conflict = name === "clients" ? "client_number" : name === "donors" ? "donor_number" : name === "volunteers" ? "volunteer_number" : name === "users" ? "email" : "id";
  const body = records.length === 1 ? current.resource.row(records[0]) : records.map((record) => current.resource.row(record));
  const preference = payload.skipExisting && name === "clients" ? "resolution=ignore-duplicates,return=minimal" : "resolution=merge-duplicates,return=minimal";
  let existed = false; if (records.length === 1) { const check = await fetch(`${current.url}/rest/v1/${current.resource.table}?select=id&id=eq.${encodeURIComponent(String(records[0].id))}&limit=1`, { headers: headers(current.key, current.accessToken), cache: "no-store" }); if (check.ok) existed = ((await check.json() as unknown[]).length > 0); }
  const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?on_conflict=${conflict}`, { method: "POST", headers: headers(current.key, current.accessToken, { Prefer: preference }), body: JSON.stringify(body) });
  if (!response.ok) { const detail = await response.json().catch(() => null) as { code?: string; message?: string } | null; const duplicate = detail?.code === "23505" || detail?.message?.toLowerCase().includes("duplicate"); const message = duplicate ? "El identificador ya existe. No se permiten IDs duplicados." : detail?.message || "No fue posible guardar el registro"; await synchronizationFailure(current, name, "write", message); return NextResponse.json({ error: message }, { status: duplicate ? 409 : response.status }); }
  if (name === "users") {
    for (const record of records) {
      const email = String(record.email || "").trim().toLowerCase(); if (!email) continue;
      const profileLookup = await fetch(`${current.url}/rest/v1/profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`, { headers: headers(current.key, current.accessToken), cache: "no-store" }); const profileRows = profileLookup.ok ? await profileLookup.json() as { id: string }[] : [];
      if (!profileRows[0]?.id) continue;
      const profileResponse = await fetch(`${current.url}/rest/v1/profiles?id=eq.${encodeURIComponent(profileRows[0].id)}`, { method: "PATCH", headers: headers(current.key, current.accessToken, { Prefer: "return=minimal" }), body: JSON.stringify({ profile: normalizeRole(record.profile), permissions: normalizePermissions(record.permissions), active: record.active === "Yes", updated_at: auditedAt }) });
      if (!profileResponse.ok) { const detail = await profileResponse.json().catch(() => null) as { message?: string } | null; return NextResponse.json({ error: detail?.message || "El usuario se guardó, pero no fue posible actualizar sus permisos de acceso." }, { status: profileResponse.status }); }
    }
  }
  await audit(current, payload.records ? "import" : existed ? "update" : "create", name, records.length === 1 ? String(records[0].id) : undefined, { count: records.length });
  return NextResponse.json({ ok: true, record: records.length === 1 ? records[0] : undefined });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); const id = new URL(request.url).searchParams.get("id"); if (!current || !id) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  if (name === "audit" || !can(current.role, current.resource.module, "delete", current.permissions)) return NextResponse.json({ error: "Su usuario no tiene permiso para eliminar registros." }, { status: 403 });
  const deletedAt = new Date().toISOString(); const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: headers(current.key, current.accessToken, { Prefer: "return=minimal" }), body: JSON.stringify({ deleted_at: deletedAt, deleted_by: current.actor.email }) });
  if (!response.ok) return NextResponse.json({ error: "No fue posible eliminar el registro" }, { status: response.status });
  await audit(current, "delete", name, id, { recoverable: true, deletedAt });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) { const { resource: name } = await params; const current = await context(request, name); const id = new URL(request.url).searchParams.get("id"); if (!current || !id) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }); if (name === "audit" || !["Administrator", "Supervisor"].includes(current.role)) return NextResponse.json({ error: "No autorizado para recuperar registros." }, { status: 403 }); const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: headers(current.key, current.accessToken, { Prefer: "return=minimal" }), body: JSON.stringify({ deleted_at: null, deleted_by: null }) }); if (!response.ok) return NextResponse.json({ error: "No fue posible recuperar el registro." }, { status: response.status }); await audit(current, "restore", name, id); return NextResponse.json({ ok: true }); }
