import { requireSession } from "../../lib/session";
import FoodDistribution from "./food-distribution";

export default async function ServicesPage() {
  await requireSession("services");
  return <FoodDistribution />;
}

