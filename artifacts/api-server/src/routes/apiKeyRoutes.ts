import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeyRegistryTable, type ApiKeyRegistryEntry } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/** Explicit dashboard DTO: future schema columns cannot leak accidentally. */
export type ApiKeyGuardianStatus = {
  id: number;
  service: string;
  anzeigename: string;
  pruefTyp: string;
  status: string;
  letzterFehler: string | null;
  letzterCheckAm: string | null;
  ersteErkennungAm: string;
  zuletztRotiertAm: string | null;
  secretExposed: false;
};

function toSafeStatus(entry: ApiKeyRegistryEntry): ApiKeyGuardianStatus {
  return {
    id: entry.id,
    service: entry.service,
    anzeigename: entry.anzeigename,
    pruefTyp: entry.pruefTyp,
    status: entry.status,
    // Bound generated diagnostics; never return provider payloads or secrets.
    letzterFehler: entry.letzterFehler ? entry.letzterFehler.slice(0, 500) : null,
    letzterCheckAm: entry.letzterCheckAm?.toISOString() ?? null,
    ersteErkennungAm: entry.ersteErkennungAm.toISOString(),
    zuletztRotiertAm: entry.zuletztRotiertAm?.toISOString() ?? null,
    secretExposed: false,
  };
}

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

router.get("/api-keys/status", async (_req, res) => {
  try {
    const keys = await db.select().from(apiKeyRegistryTable).orderBy(desc(apiKeyRegistryTable.updatedAt));
    res.json({ keys: keys.map(toSafeStatus), anzahl: keys.length, secretExposed: false });
  } catch (error) {
    console.error("API-Key-Guardian status failed", { error: error instanceof Error ? error.message : "unknown" });
    res.status(503).json({ error: "API-Key-Status derzeit nicht verfügbar" });
  }
});

// Human-in-the-loop action: the provider key is rotated externally by the owner.
// This endpoint never receives, stores, or generates a secret.
router.post("/api-keys/:id/rotiert", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: "Ungültige Key-ID" });
    return;
  }

  try {
    const existing = await db.select({ id: apiKeyRegistryTable.id })
      .from(apiKeyRegistryTable)
      .where(eq(apiKeyRegistryTable.id, id))
      .limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Key nicht gefunden" });
      return;
    }

    await db.update(apiKeyRegistryTable)
      .set({ zuletztRotiertAm: new Date(), letzteErinnerungGesendetAm: null })
      .where(eq(apiKeyRegistryTable.id, id));
    res.json({ erfolg: true, secretExposed: false });
  } catch (error) {
    console.error("API-Key-Guardian rotation marker failed", { error: error instanceof Error ? error.message : "unknown" });
    res.status(503).json({ error: "Rotation konnte nicht markiert werden" });
  }
});

export default router;
