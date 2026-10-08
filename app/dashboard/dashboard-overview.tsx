"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";
import { loadRemote } from "../lib/remote-records";

type Item = { id?: string; createdAt?: string; fullName?: string; firstName?: string; lastName?: string; name?: string; amount?: string; status?: string; active?: string; children?: string; adults?: string; seniors?: string; totalHousehold?: string };
type Activity = { id: string; title: string; detail: string; createdAt: string; href: string };
const read = (key: string): Item[] => { try { return JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { return []; } };
const itemName = (item: Item) => item.fullName || [item.firstName, item.lastName].filter(Boolean).join(" ") || item.name || "Registro sin nombre";
const household = (item: Item) => item.totalHousehold ? Number(item.totalHousehold) || 0 : [item.children, item.adults, item.seniors].reduce((sum, value) => sum + (Number(value) || 0), 0);

export default function DashboardOverview() {
  const [data, setData] = useState({ clients: [] as Item[], donors: [] as Item[], volunteers: [] as Item[], users: [] as Item[], food: [] as Item[], clothing: [] as Item[] });
  useEffect(() => { const local = { clients: read("uccw_clients"), donors: read("uccw_donors"), volunteers: read("uccw_volunteers"), users: read("uccw_users"), food: read("uccw_general_food_distribution"), clothing: read("uccw_clothing_drive") }; Promise.all([loadRemote<Item>("clients", local.clients), loadRemote<Item>("donors", local.donors), loadRemote<Item>("volunteers", local.volunteers), loadRemote<Item>("food", local.food), loadRemote<Item>("clothing", local.clothing)]).then(([clients, donors, volunteers, food, clothing]) => setData({ clients, donors, volunteers, users: local.users, food, clothing })); }, []);
  const metrics = useMemo(() => ({ clients: data.clients.length, donors: data.donors.length, volunteers: data.volunteers.filter((volunteer) => volunteer.status === "Active").length, users: data.users.filter((user) => user.active === "Yes").length }), [data]);
  const activity = useMemo(() => {
    const collections: [Item[], string, string, string][] = [[data.clients, "Cliente", "Nuevo cliente", "/clientes"], [data.donors, "Donante", "Nueva donación", "/donantes"], [data.volunteers, "Voluntario", "Nuevo voluntario", "/voluntarios"], [data.food, "Servicio", "Food Distribution", "/servicios"], [data.clothing, "Servicio", "Clothing Drive", "/servicios/clothing-drive"]];
    return collections.flatMap(([items, label, action, href]) => items.map((item) => ({ id: `${label}-${item.id || item.createdAt || itemName(item)}`, title: `${action}: ${itemName(item)}`, detail: label, createdAt: item.createdAt || "", href }))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  }, [data]);
  return <main className="app-shell dashboard-page"><Sidebar active="inicio" /><section className="dashboard-overview">
    <div className="dashboard-intro"><div><p className="eyebrow">Panel operativo</p><h1>Bienvenido a UCCW</h1><p>Consulta un resumen de la gestión y registra nuevas atenciones rápidamente.</p></div><Link className="secondary-button" href="/reportes">Ver reportes</Link></div>
    <div className="metric-grid dashboard-metrics"><article><span>Clientes registrados</span><strong>{metrics.clients}</strong></article><article><span>Donantes</span><strong>{metrics.donors}</strong></article><article><span>Voluntarios activos</span><strong>{metrics.volunteers}</strong></article><article><span>Usuarios activos</span><strong>{metrics.users}</strong></article></div>
    <div className="dashboard-grid"><section className="dashboard-panel"><h2>Acciones rápidas</h2><div className="quick-actions"><Link href="/clientes">+ Nuevo cliente</Link><Link href="/donantes">+ Nueva donación</Link><Link href="/voluntarios">+ Nuevo voluntario</Link><Link href="/servicios">+ Food Distribution</Link><Link href="/servicios/clothing-drive">+ Clothing Drive</Link><Link href="/usuarios">+ Nuevo usuario</Link></div></section><section className="dashboard-panel"><h2>Actividad reciente</h2>{activity.length ? <ul className="activity-list">{activity.map((entry) => <li key={entry.id}><Link href={entry.href}><strong>{entry.title}</strong><span>{entry.detail}{entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleDateString("es-DO")}` : ""}</span></Link></li>)}</ul> : <div className="empty-state"><p>Aún no hay actividad registrada.</p></div>}</section></div>
    <p className="storage-note">Los indicadores se actualizan desde Supabase al iniciar sesión.</p>
  </section></main>;
}
