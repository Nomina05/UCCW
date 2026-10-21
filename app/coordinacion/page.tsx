import { requireSession } from "../../lib/session";
import CoordinationHub from "./coordination-hub";

export default async function CoordinationPage() {
  await requireSession();
  return <CoordinationHub />;
}
