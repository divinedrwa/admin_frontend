"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/payment-methods");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-fg-secondary">Redirecting to Payment methods...</p>
    </div>
  );
}
