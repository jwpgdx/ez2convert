import { Suspense } from "react";
import ClientRedirect from "@/components/navigation/client-redirect";
import { DEFAULT_LANDING_ROUTE } from "@/lib/config/routes";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ClientRedirect destination={DEFAULT_LANDING_ROUTE} />
    </Suspense>
  );
}
