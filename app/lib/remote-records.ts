/** Supabase is the single source of truth. `fallback` stays only for call-site compatibility. */
async function request(input: RequestInfo | URL, init?: RequestInit) {
  let response = await fetch(input, init);
  if (response.status !== 401) return response;
  const renewed = await fetch("/api/session", { method: "POST", cache: "no-store" });
  if (!renewed.ok) {
    if (typeof window !== "undefined") window.location.assign("/login?expired=1");
    return response;
  }
  response = await fetch(input, init);
  return response;
}

export async function loadRemote<T>(resource: string, _fallback?: T[]): Promise<T[]> {
  const records: T[] = [];
  const pageSize = 1000;
  try {
    for (let offset = 0; offset < 50000; offset += pageSize) {
      const response = await request(`/api/records/${resource}?limit=${pageSize}&offset=${offset}`, { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json().catch(() => null) as { error?: string } | null)?.error || `Error ${response.status}`);
      const page = await response.json() as T[];
      records.push(...page);
      if (page.length < pageSize) break;
    }
    return records;
  } catch { return records; }
}
export async function loadRemotePage<T>(resource: string, page: number, pageSize: number, search = ""): Promise<{ records: T[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (search.trim()) params.set("q", search.trim());
  const response = await request(`/api/records/${resource}?${params}`, { cache: "no-store" });
  const result = await response.json().catch(() => null) as { records?: T[]; total?: number; error?: string } | null;
  if (!response.ok) throw new Error(result?.error || `Error ${response.status} al cargar los registros.`);
  return { records: result?.records || [], total: Number(result?.total) || 0 };
}
export async function saveRemote(resource: string, record: unknown) { const response = await request(`/api/records/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record }) }); const result = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(result?.error || `Error ${response.status} al guardar.`); }
export async function deleteRemote(resource: string, id: string) { const response = await request(`/api/records/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const result = await response.json().catch(() => null) as { error?: string } | null; if (!response.ok) throw new Error(result?.error || `Error ${response.status} al eliminar.`); }

