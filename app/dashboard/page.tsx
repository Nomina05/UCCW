import Link from "next/link";
import { requireSession } from "../../lib/session";

export default async function DashboardPage() {
  await requireSession();

  return (
    <main className="dashboard-page">
      <header><strong>UCCW</strong><nav><Link href="/dashboard">Inicio</Link><Link href="/clientes">Clientes</Link><Link href="/donantes">Donantes</Link><Link href="/voluntarios">Voluntarios</Link><Link href="/reportes">Reportes</Link></nav><span>Sistema de registro de casos</span></header>
      <section className="dashboard-card">
        <p className="eyebrow">Acceso autorizado</p>
        <h1>Bienvenido</h1>
        <p>El login está activo. Ya puedes administrar clientes, donantes, voluntarios y sus reportes.</p>
        <div className="dashboard-actions"><Link className="secondary-button" href="/clientes">Abrir clientes</Link><Link className="secondary-button" href="/donantes">Abrir donantes</Link><Link className="secondary-button" href="/voluntarios">Abrir voluntarios</Link><Link className="secondary-button" href="/reportes">Ver reportes</Link></div>
      </section>
    </main>
  );
}
