import Link from "next/link";
import { requireSession } from "../../lib/session";

export default async function DashboardPage() {
  await requireSession();

  return (
    <main className="dashboard-page">
      <header><strong>UCCW</strong><nav><Link href="/dashboard">Inicio</Link><Link href="/clientes">Clientes</Link></nav><span>Sistema de registro de casos</span></header>
      <section className="dashboard-card">
        <p className="eyebrow">Acceso autorizado</p>
        <h1>Bienvenido</h1>
        <p>El login está activo. Ya puedes administrar los clientes registrados en el sistema.</p>
        <Link className="secondary-button" href="/clientes">Abrir módulo de clientes</Link>
      </section>
    </main>
  );
}
