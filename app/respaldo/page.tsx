import { requireSession } from "../../lib/session";
import BackupManager from "./backup-manager";

export default async function BackupPage() { await requireSession("backup"); return <BackupManager />; }

