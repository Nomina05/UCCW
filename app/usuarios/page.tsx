import { requireSession } from "../../lib/session";
import UserManager from "./user-manager";

export default async function UsersPage() {
  await requireSession();
  return <UserManager />;
}
