import { requireSession } from "../../lib/session";
import AdministrationHub from "./administration-hub";

export default async function AdministrationPage() { await requireSession("dashboard"); return <AdministrationHub />; }
