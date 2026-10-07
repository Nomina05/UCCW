"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";

type Volunteer = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  area: "Atención a casos" | "Logística" | "Administración" | "Comunidad";
  availability: "Mañana" | "Tarde" | "Fin de semana" | "Flexible";
  status: "Activo" | "Inactivo";
  createdAt: string;
};

type VolunteerForm = Omit<Volunteer, "id" | "createdAt">;
const storageKey = "uccw_volunteers";
const initialForm: VolunteerForm = { name: "", document: "", phone: "", email: "", area: "Atención a casos", availability: "Flexible", status: "Activo" };

export default function VolunteerManager() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [form, setForm] = useState<VolunteerForm>(initialForm);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setVolunteers(JSON.parse(saved));
  }, []);

  function persist(nextVolunteers: Volunteer[]) {
    setVolunteers(nextVolunteers);
    window.localStorage.setItem(storageKey, JSON.stringify(nextVolunteers));
  }

  function openNewVolunteer() {
    setEditingVolunteer(null);
    setForm(initialForm);
    setIsFormOpen(true);
  }

  function openEditVolunteer(volunteer: Volunteer) {
    setEditingVolunteer(volunteer);
    setForm({ name: volunteer.name, document: volunteer.document, phone: volunteer.phone, email: volunteer.email, area: volunteer.area, availability: volunteer.availability, status: volunteer.status });
    setIsFormOpen(true);
  }

  function saveVolunteer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingVolunteer) {
      persist(volunteers.map((volunteer) => volunteer.id === editingVolunteer.id ? { ...volunteer, ...form } : volunteer));
    } else {
      persist([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...volunteers]);
    }
    setIsFormOpen(false);
  }

  function deleteVolunteer(volunteer: Volunteer) {
    if (window.confirm(`¿Eliminar el voluntario ${volunteer.name}?`)) persist(volunteers.filter((item) => item.id !== volunteer.id));
  }

  const visibleVolunteers = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return volunteers;
    return volunteers.filter((volunteer) => [volunteer.name, volunteer.document, volunteer.phone, volunteer.email, volunteer.area].some((value) => value.toLowerCase().includes(text)));
  }, [volunteers, search]);

  return (
    <main className="app-shell clients-page">
      <Sidebar active="voluntarios" />
      <section className="clients-content">
        <div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Voluntarios</h1><p>Registra a las personas que apoyan las actividades del sistema.</p></div><button onClick={openNewVolunteer}>+ Nuevo voluntario</button></div>
        <div className="clients-toolbar"><input aria-label="Buscar voluntarios" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, documento, correo o teléfono" /><span>{visibleVolunteers.length} voluntario{visibleVolunteers.length === 1 ? "" : "s"}</span></div>
        <div className="table-card">
          {visibleVolunteers.length === 0 ? <div className="empty-state"><h2>No hay voluntarios registrados</h2><p>Agrega el primer voluntario para comenzar.</p></div> : <table><thead><tr><th>Voluntario</th><th>Área</th><th>Disponibilidad</th><th>Contacto</th><th>Estado</th><th aria-label="Acciones"></th></tr></thead><tbody>{visibleVolunteers.map((volunteer) => <tr key={volunteer.id}><td><strong>{volunteer.name}</strong><small>{volunteer.document}</small></td><td>{volunteer.area}</td><td>{volunteer.availability}</td><td><span>{volunteer.email || "Sin correo"}</span><small>{volunteer.phone || "Sin teléfono"}</small></td><td><span className={`status ${volunteer.status === "Activo" ? "active-status" : "inactive-status"}`}>{volunteer.status}</span></td><td className="actions"><button className="text-button" onClick={() => openEditVolunteer(volunteer)}>Editar</button><button className="text-button danger" onClick={() => deleteVolunteer(volunteer)}>Eliminar</button></td></tr>)}</tbody></table>}
        </div>
        <p className="storage-note">Los datos se guardan en este navegador. Próximamente se conectarán a la base de datos central.</p>
      </section>
      {isFormOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="volunteer-form-title"><div className="modal-heading"><h2 id="volunteer-form-title">{editingVolunteer ? "Editar voluntario" : "Nuevo voluntario"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsFormOpen(false)}>×</button></div><form onSubmit={saveVolunteer}><div className="form-grid"><label className="full-width">Nombre completo<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Documento de identidad<input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} required /></label><label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as VolunteerForm["status"] })}><option>Activo</option><option>Inactivo</option></select></label><label>Área de apoyo<select value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value as VolunteerForm["area"] })}><option>Atención a casos</option><option>Logística</option><option>Administración</option><option>Comunidad</option></select></label><label>Disponibilidad<select value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value as VolunteerForm["availability"] })}><option>Mañana</option><option>Tarde</option><option>Fin de semana</option><option>Flexible</option></select></label><label>Teléfono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button type="submit">{editingVolunteer ? "Guardar cambios" : "Registrar voluntario"}</button></div></form></section></div>}
    </main>
  );
}
