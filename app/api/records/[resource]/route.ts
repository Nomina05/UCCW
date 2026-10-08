import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

type Resource = "clients" | "donors" | "volunteers" | "food" | "clothing";
type StoredRecord = Record<string, unknown> & { id?: string; clientId?: string; donorId?: string; volunteerId?: string; fullName?: string; firstName?: string; lastName?: string; date?: string; address?: string; children?: string; adults?: string; seniors?: string; totalHousehold?: string; createdAt?: string };

function hasContent(value: unknown) { return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null; }
function mergeClientRecord(existing: StoredRecord, incoming: StoredRecord) {
  const merged: StoredRecord = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "legacyData" || key === "legacySources" || key === "id" || key === "createdAt") continue;
    if (typeof value === "boolean") merged[key] = Boolean(merged[key]) || value;
    else if (Array.isArray(value)) merged[key] = Array.from(new Set([...(Array.isArray(merged[key]) ? merged[key] as unknown[] : []), ...value].filter(hasContent)));
    else if (hasContent(value)) merged[key] = value;
  }
  const sources = [...(Array.isArray(existing.legacySources) ? existing.legacySources : []), existing.legacyData, ...(Array.isArray(incoming.legacySources) ? incoming.legacySources : []), incoming.legacyData].filter(hasContent);
  const seen = new Set<string>(); merged.legacySources = sources.filter((source) => { const key = JSON.stringify(source); if (seen.has(key)) return false; seen.add(key); return true; });
  merged.legacyData = incoming.legacyData || existing.legacyData; merged.id = existing.id || incoming.id; merged.createdAt = existing.createdAt || incoming.createdAt;
  return merged;
}

const resources: Record<Resource, { table: string; serviceType?: string; row: (record: StoredRecord) => Record<string, unknown> }> = {
  clients: { table: "clients", row: (record) => ({ id: record.id, client_number: record.clientId, full_name: record.fullName, service_date: record.serviceDate || null, data: record }) },
  donors: { table: "donors", row: (record) => ({ id: record.id, donor_number: record.donorId, first_name: record.firstName, last_name: record.lastName, donation_date: record.date || null, amount: record.amount || null, data: record }) },
  volunteers: { table: "volunteers", row: (record) => ({ id: record.id, volunteer_number: record.volunteerId, first_name: record.firstName, last_name: record.lastName, status: record.status || "Active", volunteer_date: record.date || null, data: record }) },
  food: { table: "service_records", serviceType: "food_distribution", row: (record) => ({ id: record.id, service_type: "food_distribution", service_date: record.date, full_name: record.fullName, address: record.address || null, children: Number(record.children) || 0, adults: Number(record.adults) || 0, seniors: Number(record.seniors) || 0, total_household: [record.children, record.adults, record.seniors].reduce((sum, value) => sum + (Number(value) || 0), 0), data: record }) },
  clothing: { table: "service_records", serviceType: "clothing_drive", row: (record) => ({ id: record.id, service_type: "clothing_drive", service_date: record.date, full_name: record.fullName, total_household: Number(record.totalHousehold) || 0, data: record }) }
};

function resourceFrom(value: string): Resource | null { return Object.prototype.hasOwnProperty.call(resources, value) ? value as Resource : null; }
async function context(request: NextRequest, resourceName: string) {
  const resource = resourceFrom(resourceName); const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY; const token = request.cookies.get("uccw_session")?.value;
  if (!resource || !url || !key || !token) return null;
  try { const verified = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET || "uccw-demo-session-only-not-for-production-2026")); const accessToken = verified.payload.accessToken; if (typeof accessToken !== "string") return null; return { resource: resources[resource], url: url.replace(/\/$/, ""), key, accessToken }; } catch { return null; }
}
function headers(key: string, accessToken: string, extra: Record<string, string> = {}) { return { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...extra }; }

export async function GET(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const filter = current.resource.serviceType ? `&service_type=eq.${current.resource.serviceType}` : "";
  const pageSize = 1000;
  const rows: { data?: StoredRecord; id: string; created_at: string; client_number?: string }[] = [];

  for (let offset = 0; offset < 50000; offset += pageSize) {
    const clientSelect = name === "clients" ? ",client_number" : "";
    const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?select=id,data,created_at${clientSelect}&order=created_at.desc,id.desc&limit=${pageSize}&offset=${offset}${filter}`, { headers: headers(current.key, current.accessToken), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "No fue posible leer los registros" }, { status: response.status });
    const page = await response.json() as { data?: StoredRecord; id: string; created_at: string }[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return NextResponse.json(rows.map((row) => ({ ...row.data, id: row.data?.id || row.id, clientId: name === "clients" ? row.client_number || row.data?.clientId : row.data?.clientId, createdAt: row.data?.createdAt || row.created_at })));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); if (!current) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const payload = await request.json() as { record?: StoredRecord; records?: StoredRecord[]; skipExisting?: boolean; mergeExisting?: boolean }; let records = payload.records || (payload.record ? [payload.record] : []);
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
  const conflict = records.length > 1 && name === "clients" ? "client_number" : "id";
  const body = records.length === 1 ? current.resource.row(records[0]) : records.map((record) => current.resource.row(record));
  const preference = payload.skipExisting && name === "clients" ? "resolution=ignore-duplicates,return=minimal" : "resolution=merge-duplicates,return=minimal";
  const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?on_conflict=${conflict}`, { method: "POST", headers: headers(current.key, current.accessToken, { Prefer: preference }), body: JSON.stringify(body) });
  if (!response.ok) return NextResponse.json({ error: "No fue posible guardar el registro" }, { status: response.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource: name } = await params; const current = await context(request, name); const id = new URL(request.url).searchParams.get("id"); if (!current || !id) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const response = await fetch(`${current.url}/rest/v1/${current.resource.table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: headers(current.key, current.accessToken) });
  if (!response.ok) return NextResponse.json({ error: "No fue posible eliminar el registro" }, { status: response.status });
  return NextResponse.json({ ok: true });
}
