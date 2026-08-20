import { claimStripeEvent } from "../artifacts/api-server/src/services/stripeEventClaimService";

async function main() {
  const results = await Promise.all(
    Array.from({ length: 20 }, () => claimStripeEvent("evt_test_atomic_001", "payment_intent.succeeded")),
  );
  const winners = results.filter(Boolean).length;
  if (winners !== 1) throw new Error(`Erwartet: 1 Claim, erhalten: ${winners}`);
  console.log(JSON.stringify({ ok: true, total: results.length, winners }));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
