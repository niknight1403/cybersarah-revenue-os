export type SocialPlatform = "tiktok" | "instagram" | "youtube_shorts";

const PLATFORM_ENV_VAR: Record<SocialPlatform, string> = {
  tiktok: "TIKTOK_ACCESS_TOKEN",
  instagram: "INSTAGRAM_ACCESS_TOKEN",
  youtube_shorts: "YOUTUBE_ACCESS_TOKEN",
};

const PLATFORM_SETUP_HINWEIS: Record<SocialPlatform, string> = {
  tiktok: "TikTok Developer-Account einrichten, Content Posting API aktivieren, Token in TIKTOK_ACCESS_TOKEN setzen.",
  instagram: "Meta for Developers App einrichten, Instagram Graph API verbinden, Token in INSTAGRAM_ACCESS_TOKEN setzen.",
  youtube_shorts: "Google Cloud Projekt und YouTube Data API aktivieren, Token in YOUTUBE_ACCESS_TOKEN setzen.",
};

export type ConnectorStatus =
  | { available: true; platform: SocialPlatform }
  | { available: false; platform: SocialPlatform; reason: string; setupHinweis: string };

export function checkSocialConnectorAvailable(platform: SocialPlatform): ConnectorStatus {
  const envVar = PLATFORM_ENV_VAR[platform];
  const token = process.env[envVar];

  if (!token || token.trim().length === 0) {
    return {
      available: false,
      platform,
      reason: "Kein " + envVar + " gesetzt - Verbindung zu " + platform + " wurde noch nicht eingerichtet.",
      setupHinweis: PLATFORM_SETUP_HINWEIS[platform],
    };
  }

  return { available: true, platform };
}

export function checkAllSocialConnectors(): ConnectorStatus[] {
  return (Object.keys(PLATFORM_ENV_VAR) as SocialPlatform[]).map(checkSocialConnectorAvailable);
}
