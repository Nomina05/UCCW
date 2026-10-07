"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  type: "Persona" | "Empresa";
  name: string;
  document: string;
  phone: string;
  email: string;
  status: "Activo" | "Inactivo";
  createdAt: string;
};

type ClientForm = Omit<Client, "id" | "createdAt">;

const storageKey = "uccw_clients";
const initialForm: ClientForm = { type: "Persona", name: "", document: "", phone: "", email: "", status: "Activo" };

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(initialForm);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setClients(JSON.parse(saved));
  }, []);

  function persist(nextClients: Client[]) {
    setClients(nextClients);
    window.localStorage.setItem(storageKey, JSON.stringify(nextClients));
  }

  function openNewClient() {
    setEditingClient(null);
    setForm(initialForm);
    setIsFormOpen(true);
  }

  function openEditClient(client: Client) {
    setEditingClient(client);
    setForm({ type: client.type, name: client.name, document: client.document, phone: client.phone, email: client.email, status: client.status });
    setIsFormOpen(true);
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingClient) {
      persist(clients.map((client) => client.id === editingClient.id ? { ...client, ...form } : client));
    } else {
      persist([{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...form }, ...clients]);
    }
    setIsFormOpen(false);
  }

  function deleteClient(client: Client) {
    if (window.confirm(`¿Eliminar el cliente ${client.name}?`)) {
      persist(clients.filter((item) => item.id !== client.id));
    }
  }

  const visibleClients = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return clients;
    return clients.filter((client) => [client.name, client.document, client.phone, client.email].some((value) => value.toLowerCase().includes(text)));
  }, [clients, search]);

  return (
    <main className="clients-page">
      <header className="app-header"><Link className="brand" href="/dashboard">UCCW</Link><nav><Link href="/dashboard">Inicio</Link><Link className="active" href="/clientes">Clientes</Link></nav></header>
      <section className="clients-content">
        <div className="page-heading"><div><p className="eyebrow">Administración</p><h1>Clientes</h1><p>Registra y consulta la información de clientes.</p></div><button onClick={openNewClient}>+ Nuevo cliente</button></div>

        <div className="clients-toolbar"><input aria-label="Buscar clientes" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, documento, correo o teléfono" /><span>{visibleClients.length} cliente{visibleClients.length === 1 ? "" : "s"}</span></div>

        <div className="table-card">
          {visibleClients.length === 0 ? <div className="empty-state"><h2>No hay clientes registrados</h2><p>Agrega el primer cliente para comenzar.</p></div> : <table><thead><tr><th>Cliente</th><th>Documento</th><th>Contacto</th><th>Estado</th><th aria-label="Acciones"></th></tr></thead><tbody>{visibleClients.map((client) => <tr key={client.id}><td><strong>{client.name}</strong><small>{client.type}</small></td><td>{client.document}</td><td><span>{client.email || "Sin correo"}</span><small>{client.phone || "Sin teléfono"}</small></td><td><span className={`status ${client.status === "Activo" ? "active-status" : "inactive-status"}`}>{client.status}</span></td><td className="actions"><button className="text-button" onClick={() => openEditClient(client)}>Editar</button><button className="text-button danger" onClick={() => deleteClient(client)}>Eliminar</button></td></tr>)}</tbody></table>}
        </div>
        <p className="storage-note">Los datos se guardan en este navegador. Próximamente se conectarán a la base de datos central.</p>
      </section>

      {isFormOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="client-form-title"><div className="modal-heading"><h2 id="client-form-title">{editingClient ? "Editar cliente" : "Nuevo cliente"}</h2><button className="close-button" aria-label="Cerrar" onClick={() => setIsFormOpen(false)}>×</button></div><form onSubmit={saveClient}><div className="form-grid"><label>Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ClientForm["type"] })}><option>Persona</option><option>Empresa</option></select></label><label>Estado<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ClientForm["status"] })}><option>Activo</option><option>Inactivo</option></select></label><label className="full-width">Nombre o razón social<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Documento / RNC<input value={form.document} onChange={(event) => setForm({ ...form, document: event.target.value })} required /></label><label>Teléfono<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label className="full-width">Correo electrónico<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><div className="form-actions"><button type="button" className="cancel-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button type="submit">{editingClient ? "Guardar cambios" : "Registrar cliente"}</button></div></form></section></div>}
    </main>
  );
}
