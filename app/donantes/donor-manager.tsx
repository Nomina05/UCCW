"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Donor = {
  id: string;
  type: "Persona" | "Empresa";
  name: string;
  document: string;
  phone: string;
  email: string;
  contribution: "Económica" | "En especie" | "Voluntariado";
  status: "Activo" | "Inactivo";
  createdAt: string;
};

type DonorForm = Omit<Donor, "id" | "createdAt">;

const storageKey = "uccw_donors";
const initialForm: DonorForm = { type: "Persona", name: "", document: "", phone: "", email: "", contribution: "Económica", status: "Activo" };

export default function DonorManager() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [form, setForm] = useState<DonorForm>(initialForm);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setDonors(JSON.parse(saved));
  }, []);

  function persist(nextDonors: Donor[]) {
    setDonors(nextDonors);
    window.localStorage.setItem(storageKey, JSON.stringify(nextDonors));
  }

  function openNewDonor() {
    setEditingDonor(null);
    setForm(initialForm);
    setIsFormOpen(true);
  }

  function openEditDonor(donor: Donor) {
    setEditingDonor(donor);
    setForm({ type: donor.type, name: donor.name, document: donor.document, phone: donor.phone, email: donor.email, contribution: donor.contribution, status: donor.status });
    setIsFormOpen(true);
  }

  function saveDonor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingDonor) {
      persist(donors.map((donor) => donor.id === editingDonor.id ? { ...donor, ...form } : donor));
    } else {
      persist([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...donors]);
    }
    setIsFormOpen(false);
  }

  function deleteDonor(donor: Donor) {
    if (window.confirm(`¿Eliminar el donante ${donor.name}?`)) persist(donors.filter((item) => item.id !== donor.id));
  }

  const visibleDonors = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return donors;
    return donors.filter((donor) => [donor.name, donor.document, donor.phone, donor.email, donor.contribution].some((value) => value.toLowerCase().includes(text)));
  }, [donors, search]);

  return (
    <main className="clients-page">
      <header className="app-header"><Link className="brand" href="/dashboard">UCCW</Link><nav><Link href="/dashboard">Inicio</Link><Link href="/clientes">Clientes</Link><Link className="active" href="/donantes">Donantes</Link><Link href="/voluntarios">Voluntarios</Link><Link href="/reportes">Reportes</Link></nav></header>
      <section className="clients-content">
        <div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Donantes</h1><p>Registra y consulta a quienes apoyan la organización.</p></div><button onClick={openNewDonor}>+ Nuevo donante</button></div>
        <div className="clients-toolbar"><input aria-label="Buscar donantes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, documento, correo o teléfono" /><span>{visibleDonors.length} donante{visibleDonors.length === 1 ? "" : "s"}</span></div>
        <div className="table-card">
          {visibleDonors.length === 0 ? <div className="empty-state"><h2>No hay donantes registrados</h2><p>Agrega el primer donante para comenzar.</p></div> : <table><thead><tr><th>Donante</th><th>Documento</th><th>Tipo de aporte</th><th>Contacto</th><th>Estado</th><th aria-label="Acciones"></th></tr></thead><tbody>{visibleDonors.map((donor) => <tr key={donor.id}><td><strong>{donor.name}</strong><small>{donor.type}</small></td><td>{donor.document}</td><td>{donor.contribution}</td><td><span>{donor.email || "Sin correo"}</span><small>{donor.phone || "Sin teléfono"}</small></td><td><span className={`status ${donor.status === "Activo" ? "active-status" : "inactive-status"}`}>{donor.status}</span></td><td className="actions"><button className="text-button" onClick={() => openEditDonor(donor)}>Editar</button><button className="text-button danger" onClick={() => deleteDonor(donor)}>Eliminar</button></td></tr>)}</tbody></table>}
        </div>
        <p className="storage-note">Los datos se guardan en este navegador. Próximamente se conectarán a la base de datos central.</p>
      </section>
      {isFormOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="donor-form-title"><div className="modal-heading"><h2 id="donor-form-title">{editingDonor ? "Editar donante" : "Nuevo donante"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsFormOpen(false)}>×</button></div><form onSubmit={saveDonor}><div className="form-grid"><label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DonorForm["type"] })}><option>Persona</option><option>Empresa</option></select></label><label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as DonorForm["status"] })}><option>Activo</option><option>Inactivo</option></select></label><label className="full-width">Nombre o razón social<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Documento / RNC<input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} required /></label><label>Tipo de aporte<select value={form.contribution} onChange={(event) => setForm({ ...form, contribution: event.target.value as DonorForm["contribution"] })}><option>Económica</option><option>En especie</option><option>Voluntariado</option></select></label><label>Teléfono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button type="submit">{editingDonor ? "Guardar cambios" : "Registrar donante"}</button></div></form></section></div>}
    </main>
  );
}
