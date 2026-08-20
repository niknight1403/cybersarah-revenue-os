import { db, haraSignalsTable } from "@workspace/db";

export type HaraSignalInput = {
  signalKey: string;
  signalType: "revenue" | "attribution" | "publishing" | "governance";
  amount?: number;
  currency?: string;
  attributionStatus: "attributed" | "unattributed";
  personaId?: string | null;
  campaignId?: string | null;
  offerId?: string | null;
  utmCampaign?: string | null;
  summary: string;
};

export async function emitHaraSignal(input: HaraSignalInput): Promise<boolean> {
  if (!db) return false;
  const inserted = await db.insert(haraSignalsTable).values({
    signalKey: input.signalKey,
    signalType: input.signalType,
    amount: input.amount === undefined ? null : input.amount.toFixed(2),
    currency: input.currency?.toUpperCase() ?? null,
    attributionStatus: input.attributionStatus,
    personaId: input.personaId ?? null,
    campaignId: input.campaignId ?? null,
    offerId: input.offerId ?? null,
    utmCampaign: input.utmCampaign ?? null,
    summary: input.summary.slice(0, 500),
  }).onConflictDoNothing().returning({ id: haraSignalsTable.id });
  return inserted.length > 0;
}
