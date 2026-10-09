/** Supabase is the single source of truth. `fallback` stays only for call-site compatibility. */
export async function loadRemote<T>(resource: string, _fallback?: T[]): Promise<T[]> {
  const records: T[] = [];
  const pageSize = 1000;
  try {
    for (let offset = 0; offset < 50000; offset += pageSize) {
      const response = await fetch(`/api/records/${resource}?limit=${pageSize}&offset=${offset}`, { cache: "no-store" });
      if (!response.ok) return records;
      const page = await response.json() as T[];
      records.push(...page);
      if (page.length < pageSize) break;
    }
    return records;
  } catch { return records; }
}
export function saveRemote(resource: string, record: unknown) { void fetch(`/api/records/${resource}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record }) }); }
export function deleteRemote(resource: string, id: string) { void fetch(`/api/records/${resource}?id=${encodeURIComponent(id)}`, { method: "DELETE" }); }

