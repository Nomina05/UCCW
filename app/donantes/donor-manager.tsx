"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";

type DonorForm = { donorId: string; firstName: string; lastName: string; address: string; city: string; state: string; zip: string; phone: string; email: string; date: string; amount: string; otherDonations: string; notes: string; };
type Donor = DonorForm & { id: string; createdAt: string };
const storageKey = "uccw_donors";
const initialForm: DonorForm = { donorId: "", firstName: "", lastName: "", address: "", city: "", state: "", zip: "", phone: "", email: "", date: "", amount: "", otherDonations: "", notes: "" };

function normalize(item: Partial<Donor> & { name?: string; document?: string; contribution?: string }): Donor {
  const names = (item.name || "").split(" ");
  return { ...initialForm, ...item, donorId: item.donorId || item.document || "", firstName: item.firstName || names.shift() || "", lastName: item.lastName || names.join(" "), otherDonations: item.otherDonations || item.contribution || "", id: item.id || crypto.randomUUID(), createdAt: item.createdAt || new Date().toISOString() };
}

export default function DonorManager() {
  const [donors, setDonors] = useState<Donor[]>([]); const [search, setSearch] = useState(""); const [isFormOpen, setIsFormOpen] = useState(false); const [editing, setEditing] = useState<Donor | null>(null); const [form, setForm] = useState<DonorForm>(initialForm);
  useEffect(() => { try { setDonors(JSON.parse(window.localStorage.getItem(storageKey) || "[]").map(normalize)); } catch { setDonors([]); } }, []);
  function persist(next: Donor[]) { setDonors(next); window.localStorage.setItem(storageKey, JSON.stringify(next)); }
  function update<K extends keyof DonorForm>(key: K, value: DonorForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function openNew() { setEditing(null); setForm(initialForm); setIsFormOpen(true); }
  function openEdit(donor: Donor) { setEditing(donor); setForm({ ...donor }); setIsFormOpen(true); }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (editing) persist(donors.map((donor) => donor.id === editing.id ? { ...donor, ...form } : donor)); else persist([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...donors]); setIsFormOpen(false); }
  function remove(donor: Donor) { if (window.confirm(`¿Eliminar el donante ${donor.firstName} ${donor.lastName}?`)) persist(donors.filter((item) => item.id !== donor.id)); }
  const visible = useMemo(() => { const text = search.trim().toLowerCase(); return text ? donors.filter((donor) => [donor.donorId, donor.firstName, donor.lastName, donor.city, donor.phone, donor.email].some((value) => value.toLowerCase().includes(text))) : donors; }, [donors, search]);
  return <main className="app-shell clients-page"><Sidebar active="donantes" /><section className="clients-content">
    <div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Donantes</h1><p>Registra y consulta las contribuciones recibidas.</p></div><button onClick={openNew}>+ Nuevo donante</button></div>
    <div className="clients-toolbar"><input aria-label="Buscar donantes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por Donor ID, nombre, ciudad, correo o teléfono" /><span>{visible.length} donante{visible.length === 1 ? "" : "s"}</span></div>
    <div className="table-card">{visible.length === 0 ? <div className="empty-state"><h2>No hay donantes registrados</h2><p>Agrega el primer donante para comenzar.</p></div> : <table><thead><tr><th>Donor ID</th><th>Donante</th><th>Fecha</th><th>Monto</th><th>Contacto</th><th aria-label="Acciones"></th></tr></thead><tbody>{visible.map((donor) => <tr key={donor.id}><td>{donor.donorId}</td><td><strong>{donor.firstName} {donor.lastName}</strong><small>{donor.city || "Sin ciudad"}</small></td><td>{donor.date || "No indicada"}</td><td>{donor.amount ? `$${Number(donor.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "No indicado"}</td><td><span>{donor.email || "Sin correo"}</span><small>{donor.phone || "Sin teléfono"}</small></td><td className="actions"><button className="text-button" onClick={() => openEdit(donor)}>Editar</button><button className="text-button danger" onClick={() => remove(donor)}>Eliminar</button></td></tr>)}</tbody></table>}</div>
    <p className="storage-note">Los datos se guardan en este navegador de demostración.</p>
  </section>{isFormOpen && <div className="modal-backdrop" role="presentation"><section className="modal donor-modal" role="dialog" aria-modal="true" aria-labelledby="donor-form-title"><div className="modal-heading"><h2 id="donor-form-title">{editing ? "Editar donante" : "Nuevo donante"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsFormOpen(false)}>×</button></div><form onSubmit={save}>
    <div className="form-grid"><Field label="Donor ID *"><input value={form.donorId} onChange={(e) => update("donorId", e.target.value)} required /></Field><Field label="Date"><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></Field><Field label="First Name"><input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required /></Field><Field label="Last Name"><input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required /></Field><Field label="Address" full><input value={form.address} onChange={(e) => update("address", e.target.value)} /></Field><Field label="City"><input value={form.city} onChange={(e) => update("city", e.target.value)} /></Field><Field label="State"><input value={form.state} onChange={(e) => update("state", e.target.value)} /></Field><Field label="Zip"><input value={form.zip} onChange={(e) => update("zip", e.target.value)} /></Field><Field label="Phone"><input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field><Field label="Email" full><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field><Field label="Amount"><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => update("amount", e.target.value)} /></Field><Field label="Other Donations"><input value={form.otherDonations} onChange={(e) => update("otherDonations", e.target.value)} /></Field><Field label="Notes" full><textarea rows={5} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field></div>
    <div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button type="submit">{editing ? "Guardar cambios" : "Registrar donante"}</button></div>
  </form></section></div>}</main>;
}
function Field({ label, children, full = false }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? "full-width" : ""}>{label}{children}</label>; }
