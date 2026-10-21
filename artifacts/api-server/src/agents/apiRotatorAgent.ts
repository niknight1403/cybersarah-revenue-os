import { GoogleGenAI } from '@google/genai';

export interface LLMRequestPayload {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ApiRotatorAgent {
  private providers = [
    { name: 'gemini-free', type: 'gemini', model: 'gemini-2.0-flash', active: true },
    { name: 'local-fallback', type: 'mock', active: true }
  ];

  async executeWithFreeRoute(payload: LLMRequestPayload): Promise<string> {
    for (const provider of this.providers.filter(p => p.active)) {
      try {
        console.log(`🔄 [ApiRotator] Nutze kostenlose Route: ${provider.name}`);
        
        if (provider.type === 'gemini') {
          const ai = new GoogleGenAI();
          const response = await ai.models.generateContent({
            model: provider.model,
            contents: [payload.prompt],
            config: { systemInstruction: payload.systemPrompt }
          });
          if (response.text) return response.text;
        }
        
        if (provider.type === 'mock') {
          return `[Elite Autonomous Fallback] Generierte Antwort für: ${payload.prompt.substring(0, 50)}...`;
        }
      } catch (error: any) {
        console.warn(`⚠️ [ApiRotator] Provider ${provider.name} fehlgeschlagen (${error.message}), rotiere zur nächsten Route...`);
      }
    }

    throw new Error('❌ [ApiRotator] Alle Routen und Fallbacks erschöpft.');
  }
}
