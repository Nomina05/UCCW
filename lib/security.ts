export type Role = "Administrator" | "Supervisor" | "Employee" | "Read Only";
export type Action = "read" | "write" | "delete" | "download";
export type Module = "dashboard" | "clients" | "cases" | "agenda" | "communications" | "donors" | "volunteers" | "services" | "users" | "reports" | "audit" | "backup" | "configuration";
export type ModulePermissions = Partial<Record<Module, Action[]>>;

export const modules: { id: Module; en: string; es: string; actions: Action[] }[] = [
  { id: "dashboard", en: "Dashboard", es: "Inicio", actions: ["read"] },
  { id: "clients", en: "Clients", es: "Clientes", actions: ["read", "write", "delete", "download"] },
  { id: "cases", en: "Case Management", es: "Control de casos", actions: ["read", "write", "delete"] },
  { id: "agenda", en: "Institutional Calendar", es: "Agenda institucional", actions: ["read", "write", "delete"] },
  { id: "communications", en: "Communications", es: "Comunicaciones", actions: ["read", "write", "delete"] },
  { id: "donors", en: "Donors", es: "Donantes", actions: ["read", "write", "delete"] },
  { id: "volunteers", en: "Volunteers", es: "Voluntarios", actions: ["read", "write", "delete"] },
  { id: "services", en: "Services", es: "Servicios", actions: ["read", "write", "delete"] },
  { id: "users", en: "Users", es: "Usuarios", actions: ["read", "write", "delete"] },
  { id: "reports", en: "Reports", es: "Reportes", actions: ["read", "download"] },
  { id: "audit", en: "Audit", es: "Auditoría", actions: ["read"] },
  { id: "backup", en: "Backup", es: "Respaldo", actions: ["read", "write", "download"] },
  { id: "configuration", en: "Settings", es: "Configuración", actions: ["read", "write", "download"] }
];

const matrix: Record<Role, Partial<Record<Module, Action[]>>> = {
  Administrator: { dashboard: ["read"], clients: ["read", "write", "delete", "download"], cases: ["read", "write", "delete"], agenda: ["read", "write", "delete"], communications: ["read", "write", "delete"], donors: ["read", "write", "delete"], volunteers: ["read", "write", "delete"], services: ["read", "write", "delete"], users: ["read", "write", "delete"], reports: ["read", "download"], audit: ["read"], backup: ["read", "write", "download"], configuration: ["read", "write", "download"] },
  Supervisor: { dashboard: ["read"], clients: ["read", "write", "delete", "download"], cases: ["read", "write", "delete"], agenda: ["read", "write", "delete"], communications: ["read", "write", "delete"], donors: ["read", "write", "delete"], volunteers: ["read", "write", "delete"], services: ["read", "write", "delete"], users: ["read"], reports: ["read", "download"], audit: ["read"], backup: ["read", "download"], configuration: ["read", "write", "download"] },
  Employee: { dashboard: ["read"], clients: ["read", "write", "download"], cases: ["read", "write"], agenda: ["read", "write"], communications: ["read", "write"], donors: ["read", "write"], volunteers: ["read", "write"], services: ["read", "write"], reports: ["read", "download"] },
  "Read Only": { dashboard: ["read"], clients: ["read", "download"], cases: ["read"], agenda: ["read"], communications: ["read"], donors: ["read"], volunteers: ["read"], services: ["read"], reports: ["read", "download"] }
};

export function normalizeRole(value: unknown): Role { const role = String(value || "").trim().toLowerCase(); if (role.includes("admin")) return "Administrator"; if (role.includes("super")) return "Supervisor"; if (role.includes("consult") || role.includes("read") || role.includes("volunteer")) return "Read Only"; return "Employee"; }
export function normalizePermissions(value: unknown): ModulePermissions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>; const result: ModulePermissions = {};
  for (const definition of modules) {
    if (!Object.prototype.hasOwnProperty.call(input, definition.id)) continue;
    const selected = Array.isArray(input[definition.id]) ? input[definition.id] as unknown[] : [];
    result[definition.id] = definition.actions.filter((action) => selected.includes(action));
  }
  return result;
}
export function can(role: Role, module: Module, action: Action, permissions?: ModulePermissions | null) {
  if (permissions && Object.prototype.hasOwnProperty.call(permissions, module)) return Boolean(permissions[module]?.includes(action));
  return Boolean(matrix[role]?.[module]?.includes(action));
}
export const permissionsFor = (role: Role) => matrix[role];
export function effectivePermissions(role: Role, permissions?: ModulePermissions | null): ModulePermissions {
  return Object.fromEntries(modules.map(({ id }) => [id, permissions && Object.prototype.hasOwnProperty.call(permissions, id) ? permissions[id] || [] : matrix[role]?.[id] || []])) as ModulePermissions;
}

