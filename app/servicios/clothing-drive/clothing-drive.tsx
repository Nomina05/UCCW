"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/sidebar";
import { deleteRemote, loadRemote, saveRemote } from "../../lib/remote-records";

type ClothingForm = { date: string; fullName: string; totalHousehold: string };
type ClothingRecord = ClothingForm & { id: string; createdAt: string };
const storageKey = "uccw_clothing_drive";
const initialForm: ClothingForm = { date: "", fullName: "", totalHousehold: "1" };

export default function ClothingDrive() {
  const [records, setRecords] = useState<ClothingRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ClothingRecord | null>(null);
  const [form, setForm] = useState<ClothingForm>(initialForm);

  useEffect(() => { let active = true; try { const local = JSON.parse(window.localStorage.getItem(storageKey) || "[]") as ClothingRecord[]; loadRemote<ClothingRecord>("clothing", local).then((records) => { if (active) { setRecords(records); window.localStorage.setItem(storageKey, JSON.stringify(records)); } }); } catch { setRecords([]); } return () => { active = false; }; }, []);
  function persist(next: ClothingRecord[]) { setRecords(next); window.localStorage.setItem(storageKey, JSON.stringify(next)); }
  function openNew() { setEditing(null); setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) }); setIsOpen(true); }
  function openEdit(record: ClothingRecord) { setEditing(record); setForm({ date: record.date, fullName: record.fullName, totalHousehold: record.totalHousehold }); setIsOpen(true); }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const record = editing ? { ...editing, ...form } : { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }; persist(editing ? records.map((item) => item.id === editing.id ? record : item) : [record, ...records]); saveRemote("clothing", record); setIsOpen(false); }
  function remove(record: ClothingRecord) { if (window.confirm(`¿Eliminar el registro de ${record.fullName}?`)) { persist(records.filter((item) => item.id !== record.id)); deleteRemote("clothing", record.id); } }
  const visible = useMemo(() => { const text = search.trim().toLowerCase(); return text ? records.filter((record) => [record.date, record.fullName].some((value) => value.toLowerCase().includes(text))) : records; }, [records, search]);

  return <main className="app-shell clients-page"><Sidebar active="servicios" /><section className="clients-content">
    <div className="page-heading"><div><p className="eyebrow">Services</p><h1>Clothing Drive</h1><p>Registro de entrega de ropa por hogar.</p></div><button onClick={openNew}>+ Add new</button></div>
    <div className="service-switcher"><Link href="/servicios">General Food Distribution</Link><Link className="active" href="/servicios/clothing-drive">Clothing Drive</Link></div>
    <div className="clients-toolbar"><input aria-label="Buscar entregas de ropa" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por fecha o nombre" /><span>{visible.length} registro{visible.length === 1 ? "" : "s"}</span></div>
    <div className="table-card">{visible.length === 0 ? <div className="empty-state"><h2>No hay registros de ropa</h2><p>Agrega el primer registro para comenzar.</p></div> : <table><thead><tr><th>Date</th><th>Full Name</th><th>Total Household</th><th aria-label="Acciones"></th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td>{record.date}</td><td><strong>{record.fullName}</strong></td><td>{record.totalHousehold}</td><td className="actions"><button className="text-button" onClick={() => openEdit(record)}>Editar</button><button className="text-button danger" onClick={() => remove(record)}>Eliminar</button></td></tr>)}</tbody></table>}</div>
    <p className="storage-note">Los registros se guardan en este navegador de demostración.</p>
  </section>{isOpen && <div className="modal-backdrop" role="presentation"><section className="modal service-modal" role="dialog" aria-modal="true" aria-labelledby="clothing-form-title"><div className="modal-heading"><h2 id="clothing-form-title">{editing ? "Editar entrega de ropa" : "Add new"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsOpen(false)}>×</button></div><form onSubmit={save}><div className="form-grid"><label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></label><label>Full Name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label><label>Total Household<input type="number" min="1" value={form.totalHousehold} onChange={(event) => setForm({ ...form, totalHousehold: event.target.value })} required /></label></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsOpen(false)}>Cancelar</button><button type="submit">{editing ? "Guardar cambios" : "Add new"}</button></div></form></section></div>}</main>;
}
