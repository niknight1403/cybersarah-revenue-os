export type SubscriptionProduct = {
  id: "free_trial" | "monthly" | "annual";
  label: string;
  entitlement: "hara_basic" | "hara_pro";
  billingPeriod: "trial" | "month" | "year";
};

export function getSubscriptionReadiness() {
  const products: SubscriptionProduct[] = [
    { id: "free_trial", label: "HARA Testphase", entitlement: "hara_basic", billingPeriod: "trial" },
    { id: "monthly", label: "HARA Monat", entitlement: "hara_pro", billingPeriod: "month" },
    { id: "annual", label: "HARA Jahr", entitlement: "hara_pro", billingPeriod: "year" },
  ];
  return {
    provider: "google_play_billing_via_revenuecat" as const,
    status: "not_configured" as const,
    products,
    paywallReady: true,
    purchaseExecution: false,
    approvalRequired: true,
    requiresProviderSetup: true,
  };
}
