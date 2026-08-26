export type ShopifySandboxProduct = {
  id: string;
  title: string;
  priceCents: number;
  currency: "EUR";
  inventory: number;
  marginPercent: number;
  source: "sandbox";
};

export function getShopifySandboxCatalog(): {
  mode: "sandbox";
  connected: false;
  approvalRequired: true;
  products: ShopifySandboxProduct[];
} {
  return {
    mode: "sandbox",
    connected: false,
    approvalRequired: true,
    products: [
      { id: "sandbox-product-001", title: "Revenue OS Starter", priceCents: 4900, currency: "EUR", inventory: 120, marginPercent: 82, source: "sandbox" },
      { id: "sandbox-product-002", title: "Growth Intelligence Pack", priceCents: 12900, currency: "EUR", inventory: 48, marginPercent: 74, source: "sandbox" },
      { id: "sandbox-product-003", title: "HARA Automation Blueprint", priceCents: 24900, currency: "EUR", inventory: 16, marginPercent: 68, source: "sandbox" },
    ],
  };
}
