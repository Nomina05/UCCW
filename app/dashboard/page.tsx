import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const token = (await cookies()).get("uccw_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) redirect("/login");

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
  } catch {
    redirect("/login");
  }

  return (
    <main className="dashboard-page">
      <header><strong>UCCW</strong><span>Sistema de registro de casos</span></header>
      <section className="dashboard-card">
        <p className="eyebrow">Acceso autorizado</p>
        <h1>Bienvenido</h1>
        <p>El login está activo. El siguiente paso será crear el módulo para registrar y gestionar casos.</p>
      </section>
    </main>
  );
}
