import { requireSession } from "../../../lib/session";
import ClothingDrive from "./clothing-drive";

export default async function ClothingDrivePage() {
  await requireSession("services");
  return <ClothingDrive />;
}

