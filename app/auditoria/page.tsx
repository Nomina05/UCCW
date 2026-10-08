import { requireSession } from "../../lib/session";
import AuditLog from "./audit-log";

export default async function AuditPage() { await requireSession(); return <AuditLog />; }
