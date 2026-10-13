import { requireSession } from "../../lib/session";
import ConfigurationManager from "./configuration-manager";

export default async function ConfigurationPage() {
  await requireSession("configuration");
  return <ConfigurationManager />;
}
