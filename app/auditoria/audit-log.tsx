"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";
import { loadRemote } from "../lib/remote-records";

type RecordItem = { id?: string; fullName?: string; firstName?: string; lastName?: string; caseNumber?: string; clientName?: string; createdAt?: string; createdBy?: string; updatedAt?: string; updatedBy?: string };
type AuditRow = { id: string; module: string; record: string; createdAt: string; createdBy: string; updatedAt: string; updatedBy: string };
const resources = [{ key: "clients", label: "Clientes" }, { key: "cases", label: "Control de casos" }, { key: "donors", label: "Donantes" }, { key: "volunteers", label: "Voluntarios" }, { key: "food", label: "Food Distribution" }, { key: "clothing", label: "Clothing Drive" }] as const;
const fallbackKeys: Record<string, string> = { clients: "uccw_clients", cases: "uccw_case_control", donors: "uccw_donors", volunteers: "uccw_volunteers", food: "uccw_general_food_distribution", clothing: "uccw_clothing_drive" };
const read = (key: string): RecordItem[] => { try { return JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { return []; } };
const name = (record: RecordItem) => record.caseNumber || record.fullName || record.clientName || [record.firstName, record.lastName].filter(Boolean).join(" ") || "Registro sin nombre";
const timestamp = (value?: string) => value ? new Date(value).toLocaleString("es-DO") : "No disponible";

export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]); const [search, setSearch] = useState("");
  useEffect(() => { let active = true; Promise.all(resources.map(async ({ key, label }) => { const records = await loadRemote<RecordItem>(key, read(fallbackKeys[key])); return records.map((record) => ({ id: `${key}-${record.id || name(record)}`, module: label, record: name(record), createdAt: record.createdAt || "", createdBy: record.createdBy || "Registro histórico", updatedAt: record.updatedAt || "", updatedBy: record.updatedBy || record.createdBy || "No disponible" })); })).then((sets) => { if (active) setRows(sets.flat().sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))); }); return () => { active = false; }; }, []);
  const visible = useMemo(() => { const text = search.trim().toLowerCase(); return text ? rows.filter((row) => [row.module, row.record, row.createdBy, row.updatedBy].some((value) => value.toLowerCase().includes(text))) : rows; }, [rows, search]);
  return <main className="app-shell clients-page"><Sidebar active="auditoria" /><section className="clients-content"><div className="page-heading"><div><p className="eyebrow">Trazabilidad</p><h1>Auditoría</h1><p>Consulta quién creó o modificó cada registro y cuándo se realizó la acción.</p></div></div><div className="clients-toolbar"><input aria-label="Buscar en auditoría" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por módulo, registro o usuario" /><span>{visible.length} registro{visible.length === 1 ? "" : "s"}</span></div><div className="table-card">{visible.length ? <table><thead><tr><th>Módulo</th><th>Registro</th><th>Creado por</th><th>Última modificación</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id}><td>{row.module}</td><td><strong>{row.record}</strong></td><td><span>{row.createdBy}</span><small>{timestamp(row.createdAt)}</small></td><td><span>{row.updatedBy}</span><small>{timestamp(row.updatedAt)}</small></td></tr>)}</tbody></table> : <div className="empty-state"><h2>No hay datos de auditoría</h2><p>Los cambios nuevos se registrarán automáticamente.</p></div>}</div><p className="storage-note">Los registros históricos conservan su fecha original; la identificación del usuario se registra desde esta actualización en adelante.</p></section></main>;
}
