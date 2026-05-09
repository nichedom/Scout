import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TourContent } from "../types";

let geminiModelSingleton: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getGeminiModel(): ReturnType<GoogleGenerativeAI["getGenerativeModel"]> {
  if (geminiModelSingleton) return geminiModelSingleton;

  const key = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing in backend/.env — tours need a Gemini API key."
    );
  }

  const genAI = new GoogleGenerativeAI(key);
  geminiModelSingleton = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.85,
      maxOutputTokens: 4096,
    },
    systemInstruction: `You are a sharp travel guide. Be warm and specific, but concise — no filler, no lecture tone, no repetition.
Prioritize clarity and scannability over volume.
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
  const typeHint = ctx.types?.join(", ") || "unknown type";
  const wikiSection = ctx.wikiExtract
    ? `\n\nWikipedia context:\n"${ctx.wikiExtract}"`
    : "";

  return `You are creating a virtual tour guide narration for the following location:

Name: ${ctx.name}
Address: ${ctx.address}
Coordinates: ${ctx.lat.toFixed(4)}, ${ctx.lng.toFixed(4)}
Type: ${typeHint}${wikiSection}

Return a JSON object with EXACTLY this structure:
{
  "welcome": "1-2 short sentences: essence of the place, no fluff.",
  "history": "One compact paragraph (4-6 sentences max). Hit the through-line: why this place matters, 1-2 concrete dates or names if reliable, then stop.",
  "curiosities": [
    "One sentence fact 1",
    "One sentence fact 2",
    "One sentence fact 3"
  ],
  "mustSee": [
    {
      "name": "Specific point of interest name (real landmark / venue / district name)",
      "description": "One short sentence on why go / what to notice",
      "type": "landmark | museum | natural | food | cultural | neighborhood"
    }
  ],
  "localTips": "One or two short sentences: practical, concrete (timing, crowds, a single \"do this\").",
  "closing": "One short punchy line to sign off.",
  "sources": ["Wikipedia", "Gemini AI"]
}

Rules: fewer words beat more. No bullet-style phrasing inside string fields. mustSee must have exactly 3 or 4 items, each a real, googleable place name tied to this location (not vague).`;
}

function extractJson(text: string): string {
  const mdMatch = text.match(/```(?:json)?\n?([\s\S]+?)\n?```/);
  if (mdMatch) return mdMatch[1].trim();

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
    throw new Error(
      `Failed to parse Gemini response as JSON: ${(err as Error).message}`
    );
  }

  if (ctx.wikiExtract && !parsed.sources?.includes("Wikipedia")) {
    parsed.sources = [...(parsed.sources ?? []), "Wikipedia"];
  }

  return {
    tour: parsed,
    tokens: usage?.totalTokenCount ?? 0,
  };
}
