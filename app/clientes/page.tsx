import { requireSession } from "../../lib/session";
import ClientManager from "./client-manager";

export default async function ClientsPage() {
  await requireSession();
  return <ClientManager />;
}
