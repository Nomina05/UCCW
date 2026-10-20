import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return <main className="login-page"><section className="login-card"><p className="eyebrow">UCCW</p><h1>Reset password</h1>{sent ? <><p className="subtitle">If the email belongs to an active account, you will receive a secure recovery link shortly.</p><a className="login-return-link" href="/login">Return to sign in</a></> : <><p className="subtitle">Enter your account email to receive a secure recovery link.</p><form action={requestPasswordReset}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required autoFocus /><button type="submit">Send recovery link</button></form><a className="login-return-link" href="/login">Return to sign in</a></>}</section></main>;
}
