import { continueSession, login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; active?: string; device?: string; inactive?: string; replaced?: string; unconfirmed?: string; disabled?: string }> }) {
  const { error, active, device, inactive, replaced, unconfirmed, disabled } = await searchParams;
  const hasSupabaseAuth = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">UCCW</p>
        <h1>Iniciar sesión</h1>
        <p className="subtitle">Sistema de registro de casos</p>
        {hasSupabaseAuth ? <p className="demo-note">Accede con las credenciales asignadas por el administrador.</p> : <p className="demo-note">Modo demostración: <strong>demo@uccw.local</strong> · <strong>UccwDemo2026!</strong></p>}
        {active ? <div className="session-conflict" role="alert"><strong>Usuario activo en otro dispositivo</strong><p>Esta cuenta ya tiene una sesión activa en {device || "otro dispositivo"}. ¿Desea continuar aquí y cerrar la sesión anterior?</p><form action={continueSession}><button type="submit">Continuar en este dispositivo</button></form><a href="/login">Cancelar</a></div> : <form action={login}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {error && <p className="error" role="alert">Correo o contraseña incorrectos.</p>}
          {unconfirmed && <p className="error" role="alert">La cuenta existe, pero su correo todavía no ha sido confirmado. Solicite al administrador que establezca una nueva contraseña.</p>}
          {disabled && <p className="error" role="alert">Esta cuenta está inactiva. Comuníquese con el administrador.</p>}
          {inactive && <p className="error" role="alert">La sesión se cerró después de 10 minutos de inactividad.</p>}
          {replaced && <p className="error" role="alert">La sesión se cerró porque la cuenta inició sesión en otro dispositivo.</p>}
          <button type="submit">Entrar</button>
        </form>}
      </section>
    </main>
  );
}
