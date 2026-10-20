import { requirePasswordChangeSession } from "../../lib/session";
import { changeInitialPassword } from "./actions";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePasswordChangeSession(); const { error } = await searchParams;
  return <main className="login-page"><section className="login-card"><p className="eyebrow">UCCW</p><h1>Change your password</h1><p className="subtitle">For security, create a personal password before entering the system.</p><form action={changeInitialPassword}><label htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus /><small>At least 8 characters, including uppercase, lowercase, and a number.</small><label htmlFor="confirmation">Confirm new password</label><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />{error === "mismatch" && <p className="error" role="alert">Passwords do not match.</p>}{error === "weak" && <p className="error" role="alert">The password does not meet the security requirements.</p>}{error === "save" && <p className="error" role="alert">The password could not be changed. Please try again.</p>}<button type="submit">Save password and continue</button></form></section></main>;
}
