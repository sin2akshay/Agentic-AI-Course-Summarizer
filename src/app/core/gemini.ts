import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { environment } from '../../environments/environment';

const GENERATED_DATA_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sessionId', 'sessionOverview', 'instructorTakeaways', 'summary', 'qa'],
  properties: {
    sessionId: { type: 'integer' },
    sessionOverview: { type: 'string' },
    instructorTakeaways: {
      type: 'array',
      minItems: 6,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'body'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' }
        }
      }
    },
    summary: {
      type: 'array',
      minItems: 10,
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['timestamp', 'title'],
        properties: {
          timestamp: { type: 'string' },
          title: { type: 'string' }
        }
      }
    },
    qa: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'answer'],
        properties: {
          timestamp: { type: 'string' },
          speaker: { type: 'string' },
          question: { type: 'string' },
          answer: { type: 'string' }
        }
      }
    }
  }
} as const;

export interface GeneratedData {
  sessionId: number;
  videoUrl?: string;
  sessionOverview: string;
  instructorTakeaways: {
    title: string;
    body: string;
  }[];
  summary: { timestamp: string; title: string }[];
  qa: {
    timestamp?: string;
    speaker?: string;
    question: string;
    answer: string;
    rating?: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const key = environment.geminiApiKey;
    if (key && key !== 'YOUR_GEMINI_API_KEY_HERE') {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  async listAvailableModels(): Promise<string[]> {
    if (!this.client) return [];
    try {
      const availableModels: string[] = [];
      const response = await this.client.models.list();

      for await (const m of response) {
        const model = m as { name?: string; supportedActions?: string[] };
        const name = model.name || '';
        const actions = model.supportedActions || [];

        const isGenerative = actions.includes('generateContent') ||
          (name.includes('gemini') && !name.includes('embedding'));

        if (isGenerative) {
          availableModels.push(name.replace(/^models\//, ''));
        }
      }
      return availableModels;
    } catch (error) {
      console.error('[EAG v3] Model listing failed:', error);
      return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async processTranscript(transcript: string, videoUrl: string, sessionId: number, modelOverride?: string): Promise<GeneratedData> {
    if (!this.client) {
      throw new Error('Gemini API key is not configured');
    }

    const modelName = modelOverride || 'gemini-1.5-flash';

    try {
      const result = await this.client.models.generateContent({
        model: modelName,
        contents: [{
          role: 'user',
          parts: [{ text: `URL: ${videoUrl}\nTranscript: ${transcript}` }]
        }],
        config: {
          temperature: 0,
          systemInstruction: this.getSystemInstruction(sessionId),
          responseMimeType: 'application/json',
          responseJsonSchema: GENERATED_DATA_RESPONSE_SCHEMA
        }
      });

      const outputText = result.text?.trim();
      if (!outputText) {
        throw new Error('Empty response from model');
      }

      return this.parseGeneratedData(outputText);

    } catch (error) {
      console.error(`[EAG v3] ${modelName} failed:`, error);
      throw error;
    }
  }

  private parseGeneratedData(outputText: string): GeneratedData {
    const parsed = JSON.parse(outputText) as GeneratedData;

    if (
      typeof parsed !== 'object' || parsed === null
      || typeof parsed.sessionId !== 'number'
      || typeof parsed.sessionOverview !== 'string'
      || !Array.isArray(parsed.instructorTakeaways)
      || !Array.isArray(parsed.summary)
      || !Array.isArray(parsed.qa)
    ) {
      throw new Error('Gemini response did not match the expected session data structure');
    }

    if (!parsed.instructorTakeaways.every(
      (item) => typeof item === 'object' && item !== null && typeof item.title === 'string' && typeof item.body === 'string'
    )) {
      throw new Error('Gemini response: instructorTakeaways items are malformed');
    }

    if (!parsed.summary.every(
      (item) => typeof item === 'object' && item !== null && typeof item.timestamp === 'string' && typeof item.title === 'string'
    )) {
      throw new Error('Gemini response: summary items are malformed');
    }

    if (!parsed.qa.every(
      (item) => typeof item === 'object' && item !== null && typeof item.question === 'string' && typeof item.answer === 'string'
    )) {
      throw new Error('Gemini response: qa items are malformed');
    }

    return parsed;
  }

  private getSystemInstruction(sessionId: number): string {
    return `You are an educational content engineer for the "EAG v3 Agentic AI" course.

Your job is to read a lecture transcript and return one clean JSON object for the session.

CRITICAL RULES:
1. Output valid raw JSON only. Do not use markdown fences.
2. Output exactly the keys shown below. Do not add any extra keys.
3. Every string must be plain text. No markdown, no bullets inside strings, no escaped headings.
4. Preserve chronological order in the timeline and Q&A arrays.
5. The "sessionOverview" must be 2 or 3 sentences and explain the session at a high level.
6. The "instructorTakeaways" array must contain exactly 6 items.
7. Each takeaway must reflect what the instructor explicitly taught in the session, not generic advice.
8. Each takeaway title must be short and specific. Each takeaway body must be 2 or 3 sentences.
9. Use timestamps exactly as they appear in the transcript when possible, using MM:SS or HH:MM:SS.
10. The "summary" array should contain 10 to 16 major moments only, not every minor transition.
11. The "qa" array should contain the strongest audience questions and answers from the session. Keep the answer concise but faithful.
12. The response must match the provided JSON schema exactly.

REQUIRED JSON SHAPE:
{
  "sessionId": ${sessionId},
  "sessionOverview": "Two or three sentence overview in plain text.",
  "instructorTakeaways": [
    {
      "title": "Short takeaway title",
      "body": "Two or three sentence explanation of what the instructor taught."
    }
  ],
  "summary": [
    {
      "timestamp": "MM:SS",
      "title": "Major topic or transition"
    }
  ],
  "qa": [
    {
      "timestamp": "MM:SS",
      "speaker": "Speaker name",
      "question": "Question in plain text",
      "answer": "Answer in plain text"
    }
  ]
}

QUALITY BAR:
- Prefer clarity and consistency over creativity.
- If the transcript is noisy, normalize wording but stay faithful to the instructor.
- Do not mention missing fields, assumptions, or uncertainty.
- Do not output placeholders.
- Do not include ratings; the application computes them later.`;
  }
}