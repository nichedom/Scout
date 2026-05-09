import { GoogleGenerativeAI } from '@google/generative-ai';
import type { TourContent } from '../types';

let geminiModelSingleton: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getGeminiModel(): ReturnType<GoogleGenerativeAI['getGenerativeModel']> {
  if (geminiModelSingleton) return geminiModelSingleton;

  const key = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is missing in backend/.env — tours need a Gemini API key.'
    );
  }

  const genAI = new GoogleGenerativeAI(key);
  geminiModelSingleton = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.85,
      maxOutputTokens: 2048,
    },
    systemInstruction: `You are an expert travel guide, historian, and cultural analyst with the voice of a passionate storyteller.
Your goal is to craft vivid, engaging, and educational narratives about places — mixing history, culture, local insights, and atmosphere.
Adapt your tone: solemn for historic sites, animated for lively districts, poetic for natural landscapes.
Always respond with valid JSON matching the exact schema provided. No markdown, no explanation — only the JSON object.`,
  });

  return geminiModelSingleton;
}

interface PlaceContext {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  types?: string[];
  wikiExtract: string | null;
}

interface GeminiResult {
  tour: TourContent;
  tokens: number;
}

function buildPrompt(ctx: PlaceContext): string {
  const typeHint = ctx.types?.join(', ') || 'unknown type';
  const wikiSection = ctx.wikiExtract
    ? `\n\nWikipedia context:\n"${ctx.wikiExtract}"`
    : '';

  return `You are creating a virtual tour guide narration for the following location:

Name: ${ctx.name}
Address: ${ctx.address}
Coordinates: ${ctx.lat.toFixed(4)}, ${ctx.lng.toFixed(4)}
Type: ${typeHint}${wikiSection}

Return a JSON object with EXACTLY this structure:
{
  "welcome": "A vivid, evocative 2-3 sentence welcome that captures the spirit and atmosphere of this place. Should feel like the opening line of a great travel documentary.",
  "history": "3-4 paragraphs about the history, significance, and evolution of this place. Be specific, not generic. Include key dates, people, or events if known.",
  "curiosities": [
    "Fascinating fact 1 that most visitors don't know",
    "Fascinating fact 2",
    "Fascinating fact 3",
    "Fascinating fact 4",
    "Fascinating fact 5"
  ],
  "mustSee": [
    {
      "name": "Specific point of interest name",
      "description": "1-2 sentence description of what makes it special and unmissable",
      "type": "landmark | museum | natural | food | cultural | neighborhood"
    }
  ],
  "localTips": "2-3 practical tips from a local perspective: best time to visit, hidden gems, what to avoid, local customs.",
  "closing": "One memorable sentence that leaves the visitor inspired and wanting to explore.",
  "sources": ["Wikipedia", "Gemini AI"]
}

The mustSee array should have 3-5 items specific to this location. Make the content rich, specific, and genuinely useful.`;
}

function extractJson(text: string): string {
  // Try to extract JSON from markdown code blocks
  const mdMatch = text.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  if (mdMatch) return mdMatch[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

export async function generateTourContent(ctx: PlaceContext): Promise<GeminiResult> {
  const model = getGeminiModel();
  const prompt = buildPrompt(ctx);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  let parsed: TourContent;

  try {
    parsed = JSON.parse(extractJson(text)) as TourContent;
  } catch (err) {
    throw new Error(`Failed to parse Gemini response as JSON: ${(err as Error).message}`);
  }

  // Ensure sources include Wikipedia if we had it
  if (ctx.wikiExtract && !parsed.sources?.includes('Wikipedia')) {
    parsed.sources = [...(parsed.sources ?? []), 'Wikipedia'];
  }

  return {
    tour: parsed,
    tokens: (usage?.totalTokenCount ?? 0),
  };
}
