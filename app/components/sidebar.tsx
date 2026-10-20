"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher, useLanguage } from "./language-provider";
import { can, Module, ModulePermissions, Role } from "../../lib/security";

type Section = "inicio" | "clientes" | "casos" | "agenda" | "donantes" | "voluntarios" | "servicios" | "usuarios" | "reportes" | "auditoria" | "respaldo" | "busqueda" | "configuracion";

const links: { id: Section; module: Module; href: string; en: string; es: string; icon: string }[] = [
  { id: "inicio", module: "dashboard", href: "/dashboard", en: "Home", es: "Inicio", icon: "⌂" },
  { id: "clientes", module: "clients", href: "/clientes", en: "Clients", es: "Clientes", icon: "◉" },
  { id: "busqueda", module: "clients", href: "/busqueda", en: "Advanced Search", es: "Búsqueda avanzada", icon: "⌕" },
  { id: "casos", module: "cases", href: "/casos", en: "Case Management", es: "Control de casos", icon: "◫" },
  { id: "agenda", module: "agenda", href: "/agenda", en: "Calendar", es: "Agenda", icon: "▤" },
  { id: "donantes", module: "donors", href: "/donantes", en: "Donors", es: "Donantes", icon: "♥" },
  { id: "voluntarios", module: "volunteers", href: "/voluntarios", en: "Volunteers", es: "Voluntarios", icon: "♧" },
  { id: "servicios", module: "services", href: "/servicios", en: "Services", es: "Servicios", icon: "▣" },
  { id: "usuarios", module: "users", href: "/usuarios", en: "Users", es: "Usuarios", icon: "♙" },
  { id: "reportes", module: "reports", href: "/reportes", en: "Reports", es: "Reportes", icon: "▦" },
  { id: "auditoria", module: "audit", href: "/auditoria", en: "Audit", es: "Auditoría", icon: "◷" },
  { id: "respaldo", module: "backup", href: "/respaldo", en: "Backup", es: "Respaldo", icon: "⇅" },
  { id: "configuracion", module: "configuration", href: "/configuracion", en: "Settings", es: "Configuración", icon: "⚙" }
];

export default function Sidebar({ active }: { active: Section }) {
  const { language } = useLanguage(); const [access, setAccess] = useState<{ role: Role; permissions: ModulePermissions | null; displayName: string; email: string }>({ role: "Read Only", permissions: null, displayName: "", email: "" });
  useEffect(() => { fetch("/api/session", { cache: "no-store" }).then((response) => response.json()).then((result) => setAccess({ role: result.role || "Read Only", permissions: result.permissions || null, displayName: result.displayName || result.email || "", email: result.email || "" })).catch(() => setAccess({ role: "Read Only", permissions: null, displayName: "", email: "" })); }, []);
  async function logout() { await fetch("/api/session", { method: "DELETE" }).catch(() => null); window.location.assign("/login"); }
  return <><aside className="sidebar">
    <div className="sidebar-top"><Link className="sidebar-brand" href="/dashboard"><span>U</span><strong>UCCW</strong></Link><LanguageSwitcher /></div>
    <p className="sidebar-caption">{language === "en" ? "SYSTEM MANAGEMENT" : "GESTIÓN DEL SISTEMA"}</p>
    <nav>{links.filter((link) => can(access.role, link.module, "read", access.permissions)).map((link) => <Link key={link.id} href={link.href} className={link.id === active ? "active" : ""}><span aria-hidden="true">{link.icon}</span>{language === "en" ? link.en : link.es}</Link>)}</nav>
    <p className="sidebar-footer">{language === "en" ? "Case management system" : "Sistema de registro de casos"}</p>
  </aside><details className="session-menu"><summary aria-label={language === "en" ? "Active user menu" : "Menú de usuario activo"}><span className="session-avatar" aria-hidden="true">♙</span><span className="session-identity"><strong>{access.displayName || (language === "en" ? "Active user" : "Usuario activo")}</strong><small>{access.email || access.role}</small></span><span className="session-chevron" aria-hidden="true">⌄</span></summary><div className="session-dropdown"><span>{language === "en" ? "Signed in as" : "Sesión iniciada como"}</span><strong>{access.displayName || access.email}</strong><small>{access.role}</small><button type="button" onClick={() => void logout()}>{language === "en" ? "Sign out" : "Cerrar sesión"}</button></div></details></>;
}

