export type Role = "Administrator" | "Supervisor" | "Employee" | "Read Only";
export type Action = "read" | "write" | "delete" | "download";
export type Module = "dashboard" | "clients" | "cases" | "donors" | "volunteers" | "services" | "users" | "reports" | "audit" | "backup";

const matrix: Record<Role, Partial<Record<Module, Action[]>>> = {
  Administrator: { dashboard: ["read"], clients: ["read", "write", "delete", "download"], cases: ["read", "write", "delete"], donors: ["read", "write", "delete"], volunteers: ["read", "write", "delete"], services: ["read", "write", "delete"], users: ["read", "write", "delete"], reports: ["read", "download"], audit: ["read"], backup: ["read", "write", "download"] },
  Supervisor: { dashboard: ["read"], clients: ["read", "write", "delete", "download"], cases: ["read", "write", "delete"], donors: ["read", "write", "delete"], volunteers: ["read", "write", "delete"], services: ["read", "write", "delete"], users: ["read"], reports: ["read", "download"], audit: ["read"], backup: ["read", "download"] },
  Employee: { dashboard: ["read"], clients: ["read", "write", "download"], cases: ["read", "write"], donors: ["read", "write"], volunteers: ["read", "write"], services: ["read", "write"], reports: ["read", "download"] },
  "Read Only": { dashboard: ["read"], clients: ["read", "download"], cases: ["read"], donors: ["read"], volunteers: ["read"], services: ["read"], reports: ["read", "download"] }
};

export function normalizeRole(value: unknown): Role { const role = String(value || "").trim().toLowerCase(); if (role.includes("admin")) return "Administrator"; if (role.includes("super")) return "Supervisor"; if (role.includes("consult") || role.includes("read") || role.includes("volunteer")) return "Read Only"; return "Employee"; }
export function can(role: Role, module: Module, action: Action) { return Boolean(matrix[role]?.[module]?.includes(action)); }
export const permissionsFor = (role: Role) => matrix[role];

