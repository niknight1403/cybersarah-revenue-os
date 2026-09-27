import { logger } from "./logger";
import { holeConnectorSnapshot, pruefeAlleConnector, type ConnectorZustand } from "./toolConnectorManager";

export interface ConnectorStatusBericht {
  gesamt: number;
  konfiguriert: number;
  aktiv: number;
  inaktiv: number;
  connectoren: ConnectorZustand[];
  nichtKonfiguriert: ConnectorZustand[];
  geprueftAm: string;
}

type PruefeAlleFn = () => Promise<{ geprueft: number; aktiv: number; deaktiviert: number; reaktiviert: number }>;
type SnapshotFn = () => ConnectorZustand[];

/**
 * Baut den Connector-Statusbericht: fuehrt einen Live-Sweep aller
 * Connectoren aus und gruppiert das Ergebnis fuer die Admin-API.
 */
export async function baueConnectorStatusBericht(
  pruefeAlle: PruefeAlleFn = pruefeAlleConnector,
  snapshot: SnapshotFn = holeConnectorSnapshot,
): Promise<ConnectorStatusBericht> {
  const sweep = await pruefeAlle();
  const connectoren = snapshot();
  const konfigurierte = connectoren.filter(c => c.konfiguriert);
  const bericht: ConnectorStatusBericht = {
    gesamt: connectoren.length,
    konfiguriert: konfigurierte.length,
    aktiv: konfigurierte.filter(c => c.aktiv).length,
    inaktiv: konfigurierte.filter(c => !c.aktiv).length,
    connectoren,
    nichtKonfiguriert: connectoren.filter(c => !c.konfiguriert),
    geprueftAm: new Date().toISOString(),
  };
  logger.info(
    { sweep, gesamt: bericht.gesamt, aktiv: bericht.aktiv, inaktiv: bericht.inaktiv },
    "Connector-Statusbericht erstellt",
  );
  return bericht;
}
