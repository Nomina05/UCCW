import { requireSession } from "../../lib/session";
import DonorManager from "./donor-manager";

export default async function DonorsPage() {
  await requireSession();
  return <DonorManager />;
}
