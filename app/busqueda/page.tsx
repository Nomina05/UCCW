import { requireSession } from "../../lib/session";
import AdvancedSearch from "./advanced-search";

export default async function SearchPage() { await requireSession(); return <AdvancedSearch />; }
