import { redirect } from "next/navigation";
import { DEFAULT_LANDING_ROUTE } from "@/lib/config/routes";

export default function Home() {
  redirect(DEFAULT_LANDING_ROUTE);
}
