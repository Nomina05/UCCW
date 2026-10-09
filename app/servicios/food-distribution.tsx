"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "../components/sidebar";
import { deleteRemote, loadRemote, saveRemote } from "../lib/remote-records";

type DistributionForm = { date: string; fullName: string; address: string; children: string; adults: string; seniors: string; };
type Distribution = DistributionForm & { id: string; createdAt: string };
const storageKey = "uccw_general_food_distribution";
const initialForm: DistributionForm = { date: "", fullName: "", address: "", children: "0", adults: "0", seniors: "0" };
const total = (record: DistributionForm) => [record.children, record.adults, record.seniors].reduce((sum, value) => sum + (Number(value) || 0), 0);

export default function FoodDistribution() {
  const [records, setRecords] = useState<Distribution[]>([]); const [search, setSearch] = useState(""); const [isOpen, setIsOpen] = useState(false); const [editing, setEditing] = useState<Distribution | null>(null); const [form, setForm] = useState<DistributionForm>(initialForm);
  useEffect(() => { let active = true; loadRemote<Distribution>("food").then((records) => { if (active) setRecords(records); }); return () => { active = false; }; }, []);
  function persist(next: Distribution[]) { setRecords(next); }
  function update<K extends keyof DistributionForm>(key: K, value: DistributionForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function openNew() { setEditing(null); setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) }); setIsOpen(true); }
  function openEdit(record: Distribution) { setEditing(record); setForm({ date: record.date, fullName: record.fullName, address: record.address, children: record.children, adults: record.adults, seniors: record.seniors }); setIsOpen(true); }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const record = editing ? { ...editing, ...form } : { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }; persist(editing ? records.map((item) => item.id === editing.id ? record : item) : [record, ...records]); saveRemote("food", record); setIsOpen(false); }
  function remove(record: Distribution) { if (window.confirm(`¿Eliminar el registro de ${record.fullName}?`)) { persist(records.filter((item) => item.id !== record.id)); deleteRemote("food", record.id); } }
  const visible = useMemo(() => { const text = search.trim().toLowerCase(); return text ? records.filter((record) => [record.fullName, record.address, record.date].some((value) => value.toLowerCase().includes(text))) : records; }, [records, search]);
  return <main className="app-shell clients-page"><Sidebar active="servicios" /><section className="clients-content">
    <div className="page-heading"><div><p className="eyebrow">Services</p><h1>General Food Distribution</h1><p>Registro de entrega de alimentos por hogar.</p></div><button onClick={openNew}>+ Add new</button></div>
    <div className="service-switcher"><Link className="active" href="/servicios">General Food Distribution</Link><Link href="/servicios/clothing-drive">Clothing Drive</Link></div>
    <div className="clients-toolbar"><input aria-label="Buscar distribuciones" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por fecha, nombre o dirección" /><span>{visible.length} registro{visible.length === 1 ? "" : "s"}</span></div>
    <div className="table-card">{visible.length === 0 ? <div className="empty-state"><h2>No hay registros de distribución</h2><p>Agrega el primer registro para comenzar.</p></div> : <table><thead><tr><th>Date</th><th>Full Name</th><th>Address</th><th>Children</th><th>Adults</th><th>Seniors</th><th>Total Household</th><th aria-label="Acciones"></th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.date}</td><td><strong>{record.fullName}</strong></td><td>{record.address}</td><td>{record.children}</td><td>{record.adults}</td><td>{record.seniors}</td><td><strong>{total(record)}</strong></td><td className="actions"><button className="text-button" onClick={() => openEdit(record)}>Editar</button><button className="text-button danger" onClick={() => remove(record)}>Eliminar</button></td></tr>)}</tbody></table>}</div>
    <p className="storage-note">Los registros se guardan en este navegador de demostración.</p>
  </section>{isOpen && <div className="modal-backdrop" role="presentation"><section className="modal service-modal" role="dialog" aria-modal="true" aria-labelledby="service-form-title"><div className="modal-heading"><h2 id="service-form-title">{editing ? "Editar distribución" : "Add new"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsOpen(false)}>×</button></div><form onSubmit={save}><div className="form-grid"><Field label="Date"><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required /></Field><Field label="Full Name"><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></Field><Field label="Address" full><input value={form.address} onChange={(e) => update("address", e.target.value)} required /></Field><Field label="Children"><input type="number" min="0" value={form.children} onChange={(e) => update("children", e.target.value)} /></Field><Field label="Adults"><input type="number" min="0" value={form.adults} onChange={(e) => update("adults", e.target.value)} /></Field><Field label="Seniors"><input type="number" min="0" value={form.seniors} onChange={(e) => update("seniors", e.target.value)} /></Field><Field label="Total Household"><input value={total(form)} readOnly /></Field></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsOpen(false)}>Cancelar</button><button type="submit">{editing ? "Guardar cambios" : "Add new"}</button></div></form></section></div>}</main>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? "full-width" : ""}>{label}{children}</label>; }
