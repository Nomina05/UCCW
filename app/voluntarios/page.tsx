import { requireSession } from "../../lib/session";
import VolunteerManager from "./volunteer-manager";

export default async function VolunteersPage() {
  await requireSession();
  return <VolunteerManager />;
}
