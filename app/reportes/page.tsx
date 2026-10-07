import { requireSession } from "../../lib/session";
import ReportsDashboard from "./reports-dashboard";

export default async function ReportsPage() {
  await requireSession();
  return <ReportsDashboard />;
}
