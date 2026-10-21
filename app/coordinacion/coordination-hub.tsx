"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { can, ModulePermissions, Role } from "../../lib/security";
import AgendaManager from "../agenda/agenda-manager";
import CommunicationsManager from "../comunicaciones/communications-manager";
import TrainingManager from "../capacitaciones/training-manager";
import Sidebar from "../components/sidebar";
import { useLanguage } from "../components/language-provider";

type Tab = "calendar" | "communications" | "training";
const tabModule = { calendar: "agenda", communications: "communications", training: "training" } as const;

export default function CoordinationHub() {
  const { language } = useLanguage();
  const tr = (en: string, es: string) => language === "en" ? en : es;
  const params = useSearchParams();
  const requested = params?.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(requested && tabModule[requested] ? requested : "calendar");
  const [access, setAccess] = useState<{ role: Role; permissions: ModulePermissions | null } | null>(null);

  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => setAccess({ role: value.role || "Read Only", permissions: value.permissions || null }))
      .catch(() => setAccess({ role: "Read Only", permissions: null }));
  }, []);

  const allowed = useMemo(() => access ? (Object.keys(tabModule) as Tab[]).filter((item) => can(access.role, tabModule[item], "read", access.permissions)) : [], [access]);
  useEffect(() => { if (access && !allowed.includes(tab) && allowed[0]) setTab(allowed[0]); }, [access, allowed, tab]);

  return <main className="app-shell clients-page"><Sidebar active="coordinacion" /><section className="clients-content coordination-page"><div className="page-heading"><div><p className="eyebrow">{tr("INSTITUTIONAL OPERATIONS", "OPERACIONES INSTITUCIONALES")}</p><h1>{tr("Institutional Coordination", "Coordinación Institucional")}</h1><p>{tr("Calendar, communications, and training in one workspace.", "Calendario, comunicaciones y capacitaciones en un solo espacio de trabajo.")}</p></div></div><nav className="coordination-tabs" aria-label={tr("Institutional coordination modules", "Módulos de coordinación institucional")}>{allowed.includes("calendar") && <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>▤ {tr("Calendar", "Calendario")}</button>}{allowed.includes("communications") && <button className={tab === "communications" ? "active" : ""} onClick={() => setTab("communications")}>✉ {tr("Communications", "Comunicaciones")}</button>}{allowed.includes("training") && <button className={tab === "training" ? "active" : ""} onClick={() => setTab("training")}>▦ {tr("Training", "Capacitaciones")}</button>}</nav><div className="coordination-body">{!access ? <div className="empty-state"><p>{tr("Loading permissions…", "Cargando permisos…")}</p></div> : !allowed.length ? <div className="load-error"><span>{tr("You do not have permission to view institutional coordination.", "No tiene permisos para consultar la coordinación institucional.")}</span></div> : tab === "calendar" ? <AgendaManager /> : tab === "communications" ? <CommunicationsManager /> : <TrainingManager />}</div></section></main>;
}
