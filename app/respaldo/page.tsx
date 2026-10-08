import { requireSession } from "../../lib/session";
import BackupManager from "./backup-manager";

export default async function BackupPage() { await requireSession(); return <BackupManager />; }
