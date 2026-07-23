import OpenAI from "openai";
import { logger } from "./logger";

function extrahiereKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.match(/sk-[a-zA-Z0-9\-_]{20,}/)?.[0] ?? undefined;
}

// ─── Verfügbare Keys sammeln (Reihenfolge = Priorität) ───────────────────────

const ALLE_KEYS: string[] = [];

// Primärer Key
const primärKey = extrahiereKey(
  process.env["NIKOKEY"] ??
  process.env["OPENAI_API_KEY"] ??
  process.env["Openaiapi"] ??
  process.env["Openai"]
);
if (primärKey) ALLE_KEYS.push(primärKey);

// Backup-Keys
const backupKeyRaw = process.env["OPENAI_BACKUP_KEY"];
const backupKey = extrahiereKey(backupKeyRaw);
if (backupKey && backupKey !== primärKey) ALLE_KEYS.push(backupKey);

// Weitere Backup-Keys (kommagetrennt)
const weitereKeysRaw = process.env["OPENAI_ADDITIONAL_KEYS"];
if (weitereKeysRaw) {
  for (const raw of weitereKeysRaw.split(",")) {
    const k = extrahiereKey(raw.trim());
    if (k && !ALLE_KEYS.includes(k)) ALLE_KEYS.push(k);
  }
}

if (ALLE_KEYS.length === 0) {
  logger.warn("⚠️ Kein OpenAI-API-Key gefunden — KI-Agenten laufen im Fallback-Modus");
} else {
  logger.info(
    { keysAnzahl: ALLE_KEYS.length, primärKey: ALLE_KEYS[0]?.substring(0, 12) + "..." },
    "✅ OpenAI API-Keys erkannt"
  );
}

// ─── Aktueller Client ────────────────────────────────────────────────────────

let _aktuellerKeyIndex = 0;
let _aktuellerKey: string | undefined = ALLE_KEYS[0];
let _openaiInstanz = new OpenAI({ apiKey: _aktuellerKey ?? "missing" });
let _blockierteKeys = new Set<string>();

// Proxy-Objekt damit import { openai } überall den aktuellen Client liefert
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    return (_openaiInstanz as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Key-Rotation ────────────────────────────────────────────────────────────

export function aktuellerApiKey(): string | undefined {
  return _aktuellerKey;
}

export function holeAlleKeys(): string[] {
  return [...ALLE_KEYS];
}

export function istKeyBlockiert(key: string): boolean {
  return _blockierteKeys.has(key);
}

export function blockiereKey(key: string, grund?: string): void {
  _blockierteKeys.add(key);
  logger.warn({ keyPrefix: key.substring(0, 12), grund }, "🔑 API-Key blockiert — Rotation aktiv");
}

export function deblockiereKey(key: string): void {
  _blockierteKeys.delete(key);
  logger.info({ keyPrefix: key.substring(0, 12) }, "🔑 API-Key deblockiert");
}

/**
 * Rotiert zum nächsten verfügbaren, nicht-blockierten Key.
 * Gibt den neuen Key zurück, oder undefined wenn alle blockiert sind.
 */
export function rotiereNaechstenKey(): string | undefined {
  if (ALLE_KEYS.length <= 1) return undefined;

  const startIndex = _aktuellerKeyIndex;
  for (let i = 0; i < ALLE_KEYS.length; i++) {
    const idx = (startIndex + i + 1) % ALLE_KEYS.length;
    const kandidat = ALLE_KEYS[idx]!;
    if (!_blockierteKeys.has(kandidat)) {
      _aktuellerKeyIndex = idx;
      _aktuellerKey = kandidat;
      _openaiInstanz = new OpenAI({ apiKey: kandidat });
      logger.info(
        { keyPrefix: kandidat.substring(0, 12), index: idx, gesamt: ALLE_KEYS.length },
        "🔄 OpenAI Key-Rotation — neuer Key aktiv"
      );
      return kandidat;
    }
  }

  logger.error("🚨 Alle OpenAI Keys blockiert — kein Key verfügbar!");
  return undefined;
}

export function aktualisiereApiKey(neuerKey: string): void {
  const sauber = extrahiereKey(neuerKey) ?? neuerKey.trim();
  _aktuellerKey = sauber;
  _openaiInstanz = new OpenAI({ apiKey: sauber });
  logger.info("OpenAI-Client aktualisiert — neuer API-Key geladen");
}

export function holeAktuellenKey(): string | undefined {
  return _aktuellerKey;
}

export let openaiVerfuegbar = ALLE_KEYS.length > 0;

export function aktualisiereVerfuegbarkeit(ok: boolean): void {
  openaiVerfuegbar = ok;
}

// ─── Fehler-Handling ─────────────────────────────────────────────────────────

export function ist401Fehler(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    return err.status === 401;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("401") || msg.includes("Incorrect API key") || msg.includes("Invalid API key");
}

export function ist429Fehler(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    return err.status === 429;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("Rate limit");
}

export function handleOpenAIFehler(err: unknown, agentName: string): {
  istApiKeyFehler: boolean;
  istRateLimit: boolean;
  nachricht: string;
  kannRotieren: boolean;
} {
  const istApiKeyFehler = ist401Fehler(err);
  const istRateLimit = ist429Fehler(err);
  const basisNachricht = err instanceof Error ? err.message : "Unbekannter Fehler";

  if (istApiKeyFehler) {
    logger.error(
      { agentName, fehlerTyp: "401_API_KEY" },
      `🚨 ALARM: ${agentName} — OpenAI API-Key ungültig!`
    );
    // Aktuellen Key blockieren und rotieren
    if (_aktuellerKey) blockiereKey(_aktuellerKey, "401 ungültig");
    const neuerKey = rotiereNaechstenKey();
    return {
      istApiKeyFehler: true,
      istRateLimit: false,
      nachricht: neuerKey
        ? `⚠️ API-Key ungültig — auf Backup-Key rotiert`
        : `🚨 API-Key ungültig — alle Keys erschöpft, Agent pausiert.`,
      kannRotieren: !!neuerKey,
    };
  }

  if (istRateLimit) {
    logger.warn(
      { agentName, fehlerTyp: "429_RATE_LIMIT" },
      `⚠️ ${agentName} — Rate Limit erreicht`
    );
    const neuerKey = rotiereNaechstenKey();
    return {
      istApiKeyFehler: false,
      istRateLimit: true,
      nachricht: neuerKey
        ? `⚠️ Rate Limit — auf Backup-Key rotiert`
        : `⚠️ Rate Limit — alle Keys im Limit, Wiederholung empfohlen`,
      kannRotieren: !!neuerKey,
    };
  }

  return {
    istApiKeyFehler: false,
    istRateLimit: false,
    nachricht: basisNachricht,
    kannRotieren: false,
  };
}

// ─── Integritätsprüfung ──────────────────────────────────────────────────────

export async function pruefeOpenAIVerbindung(): Promise<{
  verbunden: boolean;
  aktiverKey?: string;
  keyIndex: number;
  gesamtKeys: number;
  fehler?: string;
}> {
  for (const key of ALLE_KEYS) {
    if (_blockierteKeys.has(key)) continue;
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        _aktuellerKey = key;
        _aktuellerKeyIndex = ALLE_KEYS.indexOf(key);
        _openaiInstanz = new OpenAI({ apiKey: key });
        return {
          verbunden: true,
          aktiverKey: key.substring(0, 12) + "...",
          keyIndex: _aktuellerKeyIndex,
          gesamtKeys: ALLE_KEYS.length,
        };
      }
      if (res.status === 429) {
        logger.warn({ keyPrefix: key.substring(0, 12) }, "OpenAI Quota erschöpft — rotiere");
        continue;
      }
    } catch {
      // Netzwerkfehler — Key trotzdem als potentiell gültig behalten
    }
  }
  return {
    verbunden: false,
    keyIndex: _aktuellerKeyIndex,
    gesamtKeys: ALLE_KEYS.length,
    fehler: "Alle Keys geprüft — keiner erreichbar",
  };
}
