"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/sidebar";
import { useLanguage } from "../components/language-provider";
import { deleteRemote, loadRemote, saveRemote } from "../lib/remote-records";

type EventType = "follow-up" | "volunteer" | "event" | "food" | "clothing" | "document" | "appointment";
type CalendarEvent = { id: string; date: string; time: string; type: EventType; title: string; description: string; assignedTo: string; source?: "automatic" | "calendar"; sourceId?: string; createdAt: string };
type CaseRecord = { id: string; caseNumber?: string; clientName?: string; followUpDate?: string; assignedTo?: string; status?: string };
type Volunteer = { id: string; firstName?: string; lastName?: string; commitment?: string; date?: string; status?: string };
type Service = { id: string; date?: string; fullName?: string };
type ClientDocument = { name?: string; expiresAt?: string; category?: string };
type Client = { id: string; fullName?: string; documents?: ClientDocument[] };

const initialForm: Omit<CalendarEvent, "id" | "createdAt"> = { date: "", time: "09:00", type: "event", title: "", description: "", assignedTo: "", source: "calendar" };
const typeMeta: Record<EventType, { icon: string; en: string; es: string }> = {
  "follow-up": { icon: "↻", en: "Client follow-up", es: "Seguimiento de cliente" },
  volunteer: { icon: "♧", en: "Volunteer commitment", es: "Compromiso de voluntario" },
  event: { icon: "◆", en: "Event", es: "Evento" },
  food: { icon: "▣", en: "Food distribution", es: "Distribución de alimentos" },
  clothing: { icon: "▤", en: "Clothing drive", es: "Distribución de ropa" },
  document: { icon: "▧", en: "Document expiration", es: "Vencimiento de documento" },
  appointment: { icon: "◷", en: "Appointment", es: "Cita" }
};
const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const validDate = (value?: string) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");

export default function AgendaManager() {
  const { language } = useLanguage();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => iso(new Date()));
  const [records, setRecords] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<EventType | "all">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tr = (en: string, es: string) => language === "en" ? en : es;

  useEffect(() => {
    let active = true;
    Promise.all([
      loadRemote<CalendarEvent>("calendar-events"), loadRemote<CaseRecord>("cases"), loadRemote<Volunteer>("volunteers"),
      loadRemote<Service>("food"), loadRemote<Service>("clothing"), loadRemote<Client>("clients")
    ]).then(([custom, cases, volunteers, food, clothing, clients]) => {
      if (!active) return;
      const automatic: CalendarEvent[] = [];
      cases.forEach((item) => { if (validDate(item.followUpDate)) automatic.push({ id: `case-${item.id}`, date: item.followUpDate!, time: "", type: "follow-up", title: `${item.clientName || tr("Client", "Cliente")} · ${item.caseNumber || ""}`, description: item.status || "", assignedTo: item.assignedTo || "", source: "automatic", sourceId: item.id, createdAt: "" }); });
      volunteers.forEach((item) => { if (validDate(item.date) && item.commitment) automatic.push({ id: `volunteer-${item.id}`, date: item.date!, time: "", type: "volunteer", title: `${item.firstName || ""} ${item.lastName || ""}`.trim(), description: item.commitment, assignedTo: "", source: "automatic", sourceId: item.id, createdAt: "" }); });
      food.forEach((item) => { if (validDate(item.date)) automatic.push({ id: `food-${item.id}`, date: item.date!, time: "", type: "food", title: item.fullName || tr("Food distribution", "Distribución de alimentos"), description: "", assignedTo: "", source: "automatic", sourceId: item.id, createdAt: "" }); });
      clothing.forEach((item) => { if (validDate(item.date)) automatic.push({ id: `clothing-${item.id}`, date: item.date!, time: "", type: "clothing", title: item.fullName || tr("Clothing drive", "Distribución de ropa"), description: "", assignedTo: "", source: "automatic", sourceId: item.id, createdAt: "" }); });
      clients.forEach((client) => (client.documents || []).forEach((document, index) => { if (validDate(document.expiresAt)) automatic.push({ id: `document-${client.id}-${index}`, date: document.expiresAt!, time: "", type: "document", title: `${document.name || tr("Document", "Documento")} · ${client.fullName || tr("Client", "Cliente")}`, description: document.category || "", assignedTo: "", source: "automatic", sourceId: client.id, createdAt: "" }); }));
      setRecords([...custom.map((item) => ({ ...item, source: "calendar" as const })), ...automatic]);
    }).catch((caught) => setError(caught instanceof Error ? caught.message : tr("The calendar could not be loaded.", "No fue posible cargar la agenda."))).finally(() => setLoading(false));
    return () => { active = false; };
  }, [language]);

  const visible = useMemo(() => records.filter((item) => filter === "all" || item.type === filter), [records, filter]);
  const byDate = useMemo(() => { const result = new Map<string, CalendarEvent[]>(); visible.forEach((item) => result.set(item.date, [...(result.get(item.date) || []), item])); return result; }, [visible]);
  const days = useMemo(() => { const first = new Date(month.getFullYear(), month.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate() - first.getDay()); return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; }); }, [month]);
  const selected = (byDate.get(selectedDate) || []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = visible.filter((item) => item.date >= iso(new Date())).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 8);

  function openNew(date = selectedDate, type: EventType = "event") { setEditing(null); setForm({ ...initialForm, date, type }); setError(""); setOpen(true); }
  function openEdit(item: CalendarEvent) { if (item.source === "automatic") return; setEditing(item); setForm({ date: item.date, time: item.time, type: item.type, title: item.title, description: item.description, assignedTo: item.assignedTo, source: "calendar" }); setError(""); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); const record: CalendarEvent = editing ? { ...editing, ...form, source: "calendar" } : { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString(), source: "calendar" }; try { await saveRemote("calendar-events", record); setRecords((current) => editing ? current.map((item) => item.id === editing.id ? record : item) : [record, ...current]); setSelectedDate(record.date); setMonth(new Date(`${record.date}T12:00:00`)); setOpen(false); } catch (caught) { setError(caught instanceof Error ? caught.message : tr("The event could not be saved.", "No fue posible guardar el evento.")); } }
  async function remove(item: CalendarEvent) { if (item.source === "automatic" || !window.confirm(tr("Delete this calendar event?", "¿Eliminar este evento de la agenda?"))) return; try { await deleteRemote("calendar-events", item.id); setRecords((current) => current.filter((record) => record.id !== item.id)); } catch (caught) { setError(caught instanceof Error ? caught.message : tr("The event could not be deleted.", "No fue posible eliminar el evento.")); } }
  function moveMonth(offset: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); }

  return <main className="app-shell clients-page"><Sidebar active="agenda" /><section className="clients-content agenda-page">
    <div className="page-heading"><div><p className="eyebrow">{tr("Shared operations", "Operación compartida")}</p><h1>{tr("Institutional Calendar", "Agenda institucional")}</h1><p>{tr("Follow-ups, appointments, events, distributions, documents, and volunteer commitments.", "Seguimientos, citas, eventos, distribuciones, documentos y compromisos de voluntarios.")}</p></div><button onClick={() => openNew()}>+ {tr("New event", "Nuevo evento")}</button></div>
    {error && <div className="load-error"><span>{error}</span><button onClick={() => setError("")}>{tr("Close", "Cerrar")}</button></div>}
    <div className="agenda-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{tr("All", "Todos")}</button>{(Object.keys(typeMeta) as EventType[]).map((type) => <button key={type} className={filter === type ? `active ${type}` : type} onClick={() => setFilter(type)}><span>{typeMeta[type].icon}</span>{language === "en" ? typeMeta[type].en : typeMeta[type].es}</button>)}</div>
    {loading ? <div className="agenda-loading">{tr("Loading shared calendar…", "Cargando agenda compartida…")}</div> : <div className="agenda-layout"><section className="calendar-card"><div className="calendar-heading"><button aria-label={tr("Previous month", "Mes anterior")} onClick={() => moveMonth(-1)}>‹</button><h2>{month.toLocaleDateString(language === "en" ? "en-US" : "es-DO", { month: "long", year: "numeric" })}</h2><button aria-label={tr("Next month", "Mes siguiente")} onClick={() => moveMonth(1)}>›</button></div><div className="calendar-grid calendar-weekdays">{(language === "en" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]).map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{days.map((date) => { const key = iso(date); const events = byDate.get(key) || []; const outside = date.getMonth() !== month.getMonth(); return <button key={key} className={`calendar-day${outside ? " outside" : ""}${key === selectedDate ? " selected" : ""}${key === iso(new Date()) ? " today" : ""}`} onClick={() => setSelectedDate(key)} onDoubleClick={() => openNew(key)}><strong>{date.getDate()}</strong><span className="calendar-dots">{events.slice(0, 4).map((item) => <i key={item.id} className={item.type} title={item.title} />)}{events.length > 4 && <small>+{events.length - 4}</small>}</span></button>; })}</div></section>
      <aside className="agenda-side"><section className="dashboard-panel"><div className="panel-heading"><div><h2>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(language === "en" ? "en-US" : "es-DO", { weekday: "long", month: "long", day: "numeric" })}</h2><p>{selected.length} {tr("items", "actividades")}</p></div><button className="text-button" onClick={() => openNew(selectedDate)}>+ {tr("Add", "Agregar")}</button></div><EventList records={selected} language={language} onEdit={openEdit} onDelete={(item) => void remove(item)} empty={tr("No activities scheduled.", "No hay actividades programadas.")} /></section><section className="dashboard-panel"><h2>{tr("Upcoming", "Próximos")}</h2><EventList records={upcoming} language={language} onEdit={(item) => { setSelectedDate(item.date); setMonth(new Date(`${item.date}T12:00:00`)); }} onDelete={() => undefined} empty={tr("No upcoming activities.", "No hay actividades próximas.")} compact /></section></aside>
    </div>}
  </section>{open && <div className="modal-backdrop"><section className="modal agenda-modal"><div className="modal-heading"><div><p className="eyebrow">{tr("Shared calendar", "Agenda compartida")}</p><h2>{editing ? tr("Edit event", "Editar evento") : tr("New event or appointment", "Nuevo evento o cita")}</h2></div><button className="close-button" onClick={() => setOpen(false)}>×</button></div><form onSubmit={save}><div className="form-grid"><label>{tr("Date", "Fecha")}<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label><label>{tr("Time", "Hora")}<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label><label>{tr("Type", "Tipo")}<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}>{(Object.keys(typeMeta) as EventType[]).map((type) => <option key={type} value={type}>{language === "en" ? typeMeta[type].en : typeMeta[type].es}</option>)}</select></label><label>{tr("Responsible", "Responsable")}<input value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} /></label><label className="full-width">{tr("Title", "Título")}<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label><label className="full-width">{tr("Details", "Detalles")}<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="cancel-button" onClick={() => setOpen(false)}>{tr("Cancel", "Cancelar")}</button><button type="submit">{tr("Save", "Guardar")}</button></div></form></section></div>}</main>;
}

function EventList({ records, language, onEdit, onDelete, empty, compact = false }: { records: CalendarEvent[]; language: string; onEdit: (item: CalendarEvent) => void; onDelete: (item: CalendarEvent) => void; empty: string; compact?: boolean }) {
  if (!records.length) return <p className="agenda-empty">{empty}</p>;
  return <ul className="agenda-event-list">{records.map((item) => <li key={item.id} className={item.type}><button className="agenda-event-main" onClick={() => onEdit(item)}><span className="agenda-event-icon">{typeMeta[item.type].icon}</span><span><strong>{item.title}</strong><small>{compact ? `${item.date}${item.time ? ` · ${item.time}` : ""}` : `${item.time || (language === "en" ? "All day" : "Todo el día")} · ${language === "en" ? typeMeta[item.type].en : typeMeta[item.type].es}`}</small>{!compact && item.assignedTo && <small>{language === "en" ? "Responsible" : "Responsable"}: {item.assignedTo}</small>}</span></button>{!compact && item.source !== "automatic" && <button className="agenda-delete" onClick={() => onDelete(item)} aria-label={language === "en" ? "Delete" : "Eliminar"}>×</button>}</li>)}</ul>;
}
