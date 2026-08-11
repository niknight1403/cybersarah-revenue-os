import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeyRegistryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/api-keys/status", async (_req, res) => {
  const keys = await db.select().from(apiKeyRegistryTable).orderBy(desc(apiKeyRegistryTable.updatedAt));
  res.json({ keys, anzahl: keys.length });
});

// Manuelles "Als rotiert markieren" — setzt den Alters-Zähler zurück,
// nachdem der Mensch den Key beim Anbieter erneuert hat
router.post("/api-keys/:id/rotiert", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.update(apiKeyRegistryTable)
    .set({ zuletztRotiertAm: new Date(), letzteErinnerungGesendetAm: null })
    .where(eq(apiKeyRegistryTable.id, id));
  res.json({ erfolg: true });
});

export default router;
