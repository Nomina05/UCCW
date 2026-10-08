import { requireSession } from "../../lib/session";
import DashboardOverview from "./dashboard-overview";

export default async function DashboardPage() {
  await requireSession();

  return <DashboardOverview />;
}
