import type { SocialPlatform } from "./socialConnectors";

export function buildUtmCampaign(input: { persona: string; platform: SocialPlatform; currentDay: string }): string {
  const safePersona = input.persona.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "persona";
  return safePersona + "-" + input.platform + "-" + input.currentDay;
}

export function appendUtmToLinks(text: string, utmCampaign: string, source = "social", medium = "organic"): string {
  const urlPattern = /https?:\/\/[^\s]+/g;
  return text.replace(urlPattern, (url) => {
    const trennzeichen = url.includes("?") ? "&" : "?";
    return url + trennzeichen + "utm_source=" + encodeURIComponent(source) + "&utm_medium=" + encodeURIComponent(medium) + "&utm_campaign=" + encodeURIComponent(utmCampaign);
  });
}
