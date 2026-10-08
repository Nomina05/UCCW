import Link from "next/link";

type Section = "inicio" | "clientes" | "casos" | "donantes" | "voluntarios" | "servicios" | "usuarios" | "reportes" | "auditoria";

const links: { id: Section; href: string; label: string; icon: string }[] = [
  { id: "inicio", href: "/dashboard", label: "Inicio", icon: "⌂" },
  { id: "clientes", href: "/clientes", label: "Clientes", icon: "◉" },
  { id: "casos", href: "/casos", label: "Control de casos", icon: "◫" },
  { id: "donantes", href: "/donantes", label: "Donantes", icon: "♥" },
  { id: "voluntarios", href: "/voluntarios", label: "Voluntarios", icon: "♧" },
  { id: "servicios", href: "/servicios", label: "Servicios", icon: "▣" },
  { id: "usuarios", href: "/usuarios", label: "Users", icon: "♙" },
  { id: "reportes", href: "/reportes", label: "Reportes", icon: "▦" }
  ,{ id: "auditoria", href: "/auditoria", label: "Auditoría", icon: "◷" }
];

export default function Sidebar({ active }: { active: Section }) {
  return <aside className="sidebar">
    <Link className="sidebar-brand" href="/dashboard"><span>U</span><strong>UCCW</strong></Link>
    <p className="sidebar-caption">GESTIÓN DEL SISTEMA</p>
    <nav>{links.map((link) => <Link key={link.id} href={link.href} className={link.id === active ? "active" : ""}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</nav>
    <p className="sidebar-footer">Sistema de registro de casos</p>
  </aside>;
}
