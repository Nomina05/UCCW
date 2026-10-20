import { requireSession } from "../../lib/session";
import AgendaManager from "./agenda-manager";

export default async function AgendaPage() {
  await requireSession("agenda");
  return <AgendaManager />;
}
