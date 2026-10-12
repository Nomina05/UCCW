"use client";

import Link from "next/link";
import { LanguageSwitcher, useLanguage } from "./language-provider";

type Section = "inicio" | "clientes" | "casos" | "donantes" | "voluntarios" | "servicios" | "usuarios" | "reportes" | "auditoria" | "respaldo" | "busqueda";

const links: { id: Section; href: string; en: string; es: string; icon: string }[] = [
  { id: "inicio", href: "/dashboard", en: "Home", es: "Inicio", icon: "⌂" },
  { id: "clientes", href: "/clientes", en: "Clients", es: "Clientes", icon: "◉" },
  { id: "busqueda", href: "/busqueda", en: "Advanced Search", es: "Búsqueda avanzada", icon: "⌕" },
  { id: "casos", href: "/casos", en: "Case Management", es: "Control de casos", icon: "◫" },
  { id: "donantes", href: "/donantes", en: "Donors", es: "Donantes", icon: "♥" },
  { id: "voluntarios", href: "/voluntarios", en: "Volunteers", es: "Voluntarios", icon: "♧" },
  { id: "servicios", href: "/servicios", en: "Services", es: "Servicios", icon: "▣" },
  { id: "usuarios", href: "/usuarios", en: "Users", es: "Usuarios", icon: "♙" },
  { id: "reportes", href: "/reportes", en: "Reports", es: "Reportes", icon: "▦" },
  { id: "auditoria", href: "/auditoria", en: "Audit", es: "Auditoría", icon: "◷" },
  { id: "respaldo", href: "/respaldo", en: "Backup", es: "Respaldo", icon: "⇅" }
];

export default function Sidebar({ active }: { active: Section }) {
  const { language } = useLanguage();
  return <aside className="sidebar">
    <div className="sidebar-top"><Link className="sidebar-brand" href="/dashboard"><span>U</span><strong>UCCW</strong></Link><LanguageSwitcher /></div>
    <p className="sidebar-caption">{language === "en" ? "SYSTEM MANAGEMENT" : "GESTIÓN DEL SISTEMA"}</p>
    <nav>{links.map((link) => <Link key={link.id} href={link.href} className={link.id === active ? "active" : ""}><span aria-hidden="true">{link.icon}</span>{language === "en" ? link.en : link.es}</Link>)}</nav>
    <p className="sidebar-footer">{language === "en" ? "Case management system" : "Sistema de registro de casos"}</p>
  </aside>;
}

