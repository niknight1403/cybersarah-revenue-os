# Autonomous EU Health Influencer Engine

The CyberSarah Revenue OS now contains a dedicated health/wellness campaign engine.

## Output contract

Every generated campaign follows this JSON contract:

{
  "campaign_id": "string",
  "target_platform": ["instagram", "tiktok", "facebook"],
  "affiliate_product": "string",
  "affiliate_link": "string",
  "video_hook": "string",
  "script": "string",
  "image_prompt": "string",
  "animation_instructions": "string"
}

## Safety and quality rules

- Wellness education only; no diagnosis, treatment or cure claims.
- No guaranteed outcomes, invented studies, statistics or medical credentials.
- Affiliate URLs are never invented.
- Affiliate links are used only when configured in `system_config` under `health_affiliate_products`.
- Generated content includes an explicit affiliate/disclosure cue when a product is present.
- Avatar prompts use a consistent adult 35-60 persona and `AVATAR_REFERENCE_IMAGE`.
- The engine persists each campaign as a `health_short` content record for downstream rendering/publishing.

## Configure products

Store a JSON array in `system_config` with key `health_affiliate_products`:

[
  {
    "product": "Configured product name",
    "url": "https://example.com/your-tracked-link",
    "network": "Amazon PartnerNet",
    "disclosure": "Werbung/Affiliate-Link"
  }
]

Do not use the Amazon program homepage as a substitute for an actual tracked product URL.

## Queue

Queue type: `health_influencer_campaign`

The orchestrator schedules one campaign per day at 08:00 server time. The generated content can then be consumed by the existing rendering/webhook/social-publishing pipeline.
