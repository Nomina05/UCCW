import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">UCCW</p>
        <h1>Iniciar sesión</h1>
        <p className="subtitle">Sistema de registro de casos</p>
        <form action={login}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {error && <p className="error" role="alert">Correo o contraseña incorrectos.</p>}
          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
