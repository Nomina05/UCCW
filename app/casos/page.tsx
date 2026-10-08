import { requireSession } from "../../lib/session";
import CaseManager from "./case-manager";

export default async function CasesPage() {
  await requireSession();
  return <CaseManager />;
}
