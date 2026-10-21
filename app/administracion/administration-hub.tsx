"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { can, ModulePermissions, Role } from "../../lib/security";
import Sidebar from "../components/sidebar";
import AuditLog from "../auditoria/audit-log";
import BackupManager from "../respaldo/backup-manager";
import ConfigurationManager from "../configuracion/configuration-manager";
import TrainingManager from "../capacitaciones/training-manager";

type Tab = "audit" | "backup" | "training" | "settings";
const tabModule = { audit: "audit", backup: "backup", training: "training", settings: "configuration" } as const;
export default function AdministrationHub() {
  const params = useSearchParams(); const requested = params?.get("tab") as Tab | null; const [tab, setTab] = useState<Tab>(requested && tabModule[requested] ? requested : "settings"); const [access, setAccess] = useState<{ role: Role; permissions: ModulePermissions | null } | null>(null);
  useEffect(() => { fetch("/api/session", { cache: "no-store" }).then((response) => response.json()).then((value) => setAccess({ role: value.role || "Read Only", permissions: value.permissions || null })).catch(() => setAccess({ role: "Read Only", permissions: null })); }, []);
  const allowed = useMemo(() => access ? (Object.keys(tabModule) as Tab[]).filter((item) => can(access.role, tabModule[item], "read", access.permissions)) : [], [access]);
  useEffect(() => { if (access && !allowed.includes(tab) && allowed[0]) setTab(allowed[0]); }, [access, allowed, tab]);
  return <main className="app-shell clients-page"><Sidebar active="administracion" /><section className="clients-content administration-page"><div className="page-heading"><div><p className="eyebrow">CONTROL INSTITUCIONAL</p><h1>Administración</h1><p>Auditoría, continuidad, capacitaciones y configuración en un solo módulo.</p></div></div><nav className="administration-tabs" aria-label="Módulos administrativos">{allowed.includes("audit") && <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}>◷ Auditoría</button>}{allowed.includes("backup") && <button className={tab === "backup" ? "active" : ""} onClick={() => setTab("backup")}>⇅ Respaldo y continuidad</button>}{allowed.includes("training") && <button className={tab === "training" ? "active" : ""} onClick={() => setTab("training")}>▤ Capacitaciones</button>}{allowed.includes("settings") && <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>⚙ Configuración</button>}</nav><div className="administration-body">{!access ? <div className="empty-state"><p>Cargando permisos…</p></div> : !allowed.length ? <div className="load-error"><span>No tiene permisos para consultar funciones administrativas.</span></div> : tab === "audit" ? <AuditLog /> : tab === "backup" ? <BackupManager /> : tab === "training" ? <TrainingManager /> : <ConfigurationManager />}</div></section></main>;
}
