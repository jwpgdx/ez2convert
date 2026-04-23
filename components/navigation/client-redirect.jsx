"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClientRedirect({ destination }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const target = query ? `${destination}?${query}` : destination;

    router.replace(target);
  }, [destination, router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">Redirecting...</p>
    </main>
  );
}
