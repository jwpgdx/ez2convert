import { Suspense } from "react";
import ClientRedirect from "@/components/navigation/client-redirect";
import { ALIAS_TO_CANONICAL_ROUTE } from "@/lib/config/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ALIAS_TO_CANONICAL_ROUTE).map((alias) => ({ alias }));
}

export async function generateMetadata({ params }) {
  const { alias } = await params;
  const canonicalRoute = ALIAS_TO_CANONICAL_ROUTE[alias];

  return canonicalRoute
    ? {
        alternates: {
          canonical: canonicalRoute,
        },
        robots: {
          index: false,
          follow: true,
        },
      }
    : {};
}

export default async function AliasPage({ params }) {
  const { alias } = await params;
  const canonicalRoute = ALIAS_TO_CANONICAL_ROUTE[alias];

  return (
    <Suspense fallback={null}>
      <ClientRedirect destination={canonicalRoute} />
    </Suspense>
  );
}
