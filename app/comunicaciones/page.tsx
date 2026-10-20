import { requireSession } from "../../lib/session";
import CommunicationsManager from "./communications-manager";

export default async function CommunicationsPage() {
  await requireSession("communications");
  return <CommunicationsManager />;
}

