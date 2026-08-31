import { checkAllSocialConnectors } from "./socialConnectors";

export function buildPersonaReferenceDraft(persona: string, stilBeschreibung: string) {
  const safePersona = persona.trim().slice(0, 80);
  const safeStil = stilBeschreibung.trim().slice(0, 300);
  const connectors = checkAllSocialConnectors();
  const verbundenePlattformen = connectors.filter(c => c.available).map(c => c.platform);
  const nichtVerbundenePlattformen = connectors.filter(c => !c.available);

  return {
    actionType: "persona_reference_image_draft",
    target: "Persona-Referenzbild-Entwurf",
    payload: {
      source: "persona_studio",
      externalExecution: false,
      consentRequired: true,
      uploadReady: false,
      content: {
        persona: safePersona,
        stilBeschreibung: safeStil,
        zweck: "Einmaliges Referenzbild fuer konsistentes Erscheinungsbild ueber alle kuenftigen Posts hinweg.",
        verbundenePlattformen: verbundenePlattformen.length ? verbundenePlattformen.join(", ") : "keine",
        offenePlattformen: nichtVerbundenePlattformen.map(c => c.platform + ": " + c.setupHinweis),
        guardrail: "Nur nach Freigabe generieren; keine automatische Bildgenerierung, keine automatische Veroeffentlichung.",
      },
    },
  };
}
