import { logger } from "../lib/logger";

export async function erstelleFehlendeSequenzen(): Promise<{ erstellt: number }> {
  logger.info("📧 EmailListenAgent: Sequenzen-Check gestartet");
  // No-op when no DB configured
  return { erstellt: 0 };
}

export async function versendeFaelligeEmails(): Promise<{ versendet: number; fehler: number }> {
  logger.info("📧 EmailListenAgent: Fällige Emails Check gestartet");
  // No-op when no DB configured
  return { versendet: 0, fehler: 0 };
}
