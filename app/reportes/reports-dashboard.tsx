"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoredItem = { id: string; name: string; status: "Activo" | "Inactivo"; createdAt: string; [key: string]: string };
type Source = "Clientes" | "Donantes" | "Voluntarios";
type ReportRow = { source: Source; name: string; status: string; detail: string; createdAt: string };

const readItems = (key: string): StoredItem[] => {
  try { return JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { return []; }
};

export default function ReportsDashboard() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  function refresh() {
    const clients = readItems("uccw_clients").map((item) => ({ source: "Clientes" as const, name: item.name, status: item.status, detail: item.type || "", createdAt: item.createdAt }));
    const donors = readItems("uccw_donors").map((item) => ({ source: "Donantes" as const, name: item.name, status: item.status, detail: item.contribution || "", createdAt: item.createdAt }));
    const volunteers = readItems("uccw_volunteers").map((item) => ({ source: "Voluntarios" as const, name: item.name, status: item.status, detail: item.area || "", createdAt: item.createdAt }));
    setRows([...clients, ...donors, ...volunteers]);
    setUpdatedAt(new Date().toLocaleString("es-DO"));
  }

  useEffect(() => { refresh(); }, []);

  const totals = useMemo(() => ({
    clients: rows.filter((row) => row.source === "Clientes").length,
    donors: rows.filter((row) => row.source === "Donantes").length,
    volunteers: rows.filter((row) => row.source === "Voluntarios").length,
    active: rows.filter((row) => row.status === "Activo").length
  }), [rows]);

  const groups = useMemo(() => (["Clientes", "Donantes", "Voluntarios"] as Source[]).map((source) => ({ source, total: rows.filter((row) => row.source === source).length, active: rows.filter((row) => row.source === source && row.status === "Activo").length })), [rows]);

  function exportCsv() {
    const lines = [["Módulo", "Nombre", "Detalle", "Estado", "Fecha de registro"], ...rows.map((row) => [row.source, row.name, row.detail, row.status, row.createdAt])];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-uccw.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className="clients-page">
    <header className="app-header"><Link className="brand" href="/dashboard">UCCW</Link><nav><Link href="/dashboard">Inicio</Link><Link href="/clientes">Clientes</Link><Link href="/donantes">Donantes</Link><Link href="/voluntarios">Voluntarios</Link><Link className="active" href="/reportes">Reportes</Link></nav></header>
    <section className="clients-content">
      <div className="page-heading"><div><p className="eyebrow">Resumen del sistema</p><h1>Reportes</h1><p>Indicadores consolidados de clientes, donantes y voluntarios.</p></div><div className="report-actions"><button className="cancel-button" onClick={refresh}>Actualizar</button><button onClick={exportCsv}>Exportar CSV</button></div></div>
      <div className="metric-grid"><article><span>Total de clientes</span><strong>{totals.clients}</strong></article><article><span>Total de donantes</span><strong>{totals.donors}</strong></article><article><span>Total de voluntarios</span><strong>{totals.volunteers}</strong></article><article><span>Registros activos</span><strong>{totals.active}</strong></article></div>
      <div className="report-grid"><section className="table-card report-section"><h2>Estado por módulo</h2><table><thead><tr><th>Módulo</th><th>Total</th><th>Activos</th></tr></thead><tbody>{groups.map((group) => <tr key={group.source}><td>{group.source}</td><td>{group.total}</td><td>{group.active}</td></tr>)}</tbody></table></section><section className="table-card report-section"><h2>Actividad reciente</h2>{rows.length === 0 ? <div className="empty-state"><p>Aún no hay datos para reportar.</p></div> : <table><thead><tr><th>Módulo</th><th>Registro</th><th>Estado</th></tr></thead><tbody>{[...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((row, index) => <tr key={`${row.source}-${row.name}-${index}`}><td>{row.source}</td><td><strong>{row.name}</strong><small>{row.detail}</small></td><td><span className={`status ${row.status === "Activo" ? "active-status" : "inactive-status"}`}>{row.status}</span></td></tr>)}</tbody></table>}</section></div>
      <p className="storage-note">Última actualización: {updatedAt || "Cargando…"}. Los reportes reflejan los datos guardados en este navegador.</p>
    </section>
  </main>;
}
