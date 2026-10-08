import Link from "next/link";
import Sidebar from "../components/sidebar";
import { requireSession } from "../../lib/session";

export default async function DashboardPage() {
  await requireSession();

  return (
    <main className="app-shell dashboard-page">
      <Sidebar active="inicio" />
      <section className="dashboard-card">
        <p className="eyebrow">Acceso autorizado</p>
        <h1>Bienvenido</h1>
        <p>El login está activo. Ya puedes administrar clientes, donantes, voluntarios, servicios y reportes.</p>
        <div className="dashboard-actions"><Link className="secondary-button" href="/clientes">Abrir clientes</Link><Link className="secondary-button" href="/donantes">Abrir donantes</Link><Link className="secondary-button" href="/voluntarios">Abrir voluntarios</Link><Link className="secondary-button" href="/servicios">Abrir servicios</Link><Link className="secondary-button" href="/reportes">Ver reportes</Link></div>
      </section>
    </main>
  );
}
