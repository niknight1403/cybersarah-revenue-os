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

// ─── Rate-Limit Cooldown (temporär statt permanent) ───────────────────────────
// 429 bedeutet: Quota erschöpft, nicht Key ungültig. Nach Ablauf erneut versuchen.
const _rateLimitCooldown = new Map<string, number>(); // key → cooldownEndeMs
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 MinutenCooldown bei 429
const MAX_COOLDOWN_VERLAENGERUNG = 30 * 60 * 1000; // Max 30Min bei wiederholten 429

function istImCooldown(key: string): boolean {
  const ende = _rateLimitCooldown.get(key);
  if (!ende) return false;
  if (Date.now() < ende) return true;
  _rateLimitCooldown.delete(key);
  return false;
}

function setzeRateLimitCooldown(key: string, versuch: number = 0): void {
  const basis = RATE_LIMIT_COOLDOWN_MS;
  const verlaengerung = Math.min(versuch * 30_000, MAX_COOLDOWN_VERLAENGERUNG - basis);
  const ende = Date.now() + basis + verlaengerung;
  _rateLimitCooldown.set(key, ende);
  logger.warn(
    { keyPrefix: key.substring(0, 12), cooldownMin: Math.round((basis + verlaengerung) / 60_000) },
    "⏱️ Rate-Limit Cooldown aktiviert"
  );
}

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
  return _blockierteKeys.has(key) || istImCooldown(key);
}

export function blockiereKey(key: string, grund?: string): void {
  _blockierteKeys.add(key);
  logger.warn({ keyPrefix: key.substring(0, 12), grund }, "🔑 API-Key blockiert — Rotation aktiv");
}

export function deblockiereKey(key: string): void {
  _blockierteKeys.delete(key);
  _rateLimitCooldown.delete(key);
  logger.info({ keyPrefix: key.substring(0, 12) }, "🔑 API-Key deblockiert");
}

/**
 * Rotiert zum nächsten verfügbaren, nicht-blockierten Key.
 * Berücksichtigt sowohl permanente Blockaden als auch temporäre Rate-Limit-Cool-downs.
 * Gibt den neuen Key zurück, oder undefined wenn alle blockiert sind.
 */
export function rotiereNaechstenKey(): string | undefined {
  if (ALLE_KEYS.length <= 1) return undefined;

  const startIndex = _aktuellerKeyIndex;
  for (let i = 0; i < ALLE_KEYS.length; i++) {
    const idx = (startIndex + i + 1) % ALLE_KEYS.length;
    const kandidat = ALLE_KEYS[idx]!;
    if (!_blockierteKeys.has(kandidat) && !istImCooldown(kandidat)) {
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

  // Alle Keys im Cooldown oder blockiert — Cooldown-Status anzeigen
  const cooldowns = ALLE_KEYS.map((k, i) => {
    const ende = _rateLimitCooldown.get(k);
    const istBlockiert = _blockierteKeys.has(k);
    return `Key${i + 1}: ${istBlockiert ? "BLOCKIERT" : ende ? `Cooldown bis ${new Date(ende).toLocaleTimeString()}` : "frei"}`;
  }).join(", ");
  logger.warn({ cooldowns }, "⚠️ Alle OpenAI Keys im Cooldown/Blockiert — Fallback-Modus aktiv");
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
    // Aktuellen Key PERMANENT blockieren und rotieren
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
    // 429 = Quota erschöpft, NICHT Key ungültig → temporärer Cooldown statt permanente Blockade
    if (_aktuellerKey) {
      setzeRateLimitCooldown(_aktuellerKey);
    }
    logger.warn(
      { agentName, fehlerTyp: "429_RATE_LIMIT" },
      `⚠️ ${agentName} — Rate Limit erreicht (temporärer Cooldown)`
    );
    const neuerKey = rotiereNaechstenKey();
    return {
      istApiKeyFehler: false,
      istRateLimit: true,
      nachricht: neuerKey
        ? `⚠️ Rate Limit — auf Backup-Key rotiert`
        : `⚠️ Rate Limit — alle Keys im Limit, Agent läuft im Fallback-Modus`,
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
    if (istImCooldown(key)) {
      logger.info({ keyPrefix: key.substring(0, 12) }, "OpenAI Key im Cooldown — überspringe");
      continue;
    }
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
        setzeRateLimitCooldown(key);
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
    fehler: ALLE_KEYS.every(k => istImCooldown(k) || _blockierteKeys.has(k))
      ? `Alle ${ALLE_KEYS.length} Keys im Rate-Limit-Cooldown`
      : "Alle Keys geprüft — keiner erreichbar",
  };
}
