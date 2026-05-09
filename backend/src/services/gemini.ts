import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TourContent } from "../types";

let geminiModelSingleton: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getGeminiModel(): ReturnType<GoogleGenerativeAI["getGenerativeModel"]> {
  if (geminiModelSingleton) return geminiModelSingleton;

  const key = process.env.GEMINI_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing in backend/.env - tours need a Gemini API key."
    );
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(key);

  geminiModelSingleton = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.72,
      maxOutputTokens: 1800,
    },
    systemInstruction: `You are a warm, charismatic virtual tour guide writing for audio narration.
Write like a real guide walking with the listener through the place.
Use short, natural spoken sentences. Keep it cinematic, clear, and easy to read aloud.
Avoid academic phrasing, dense lists, markdown, headings, bullet points, and JSON.
Return plain text only.`,
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
    ? `\n\nUse this background for accuracy, but do not summarize it like an article:\n${ctx.wikiExtract}`
    : "";

  return `Create a spoken virtual walking tour for this location:

Name: ${ctx.name}
Address: ${ctx.address}
Coordinates: ${ctx.lat.toFixed(4)}, ${ctx.lng.toFixed(4)}
Type: ${typeHint}${wikiSection}

Write one continuous guided-tour script of about 550-750 words.

Style:
- Start by welcoming the listener and placing them in the scene.
- Guide them through the atmosphere as if they are standing there now.
- Include a little history, but only the most memorable details.
- Use phrases like "look around", "as we move closer", or "imagine standing here" when natural.
- Keep sentences short enough for text-to-speech.
- End with a warm sign-off that invites them to keep exploring.
- Do not use headings, bullets, markdown, JSON, or labels.
- Do not mention sources, APIs, Gemini, ElevenLabs, or prompts.
- Do not invent exact facts if the source context is uncertain.`;
}

function cleanScript(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+(?:\s|$)/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [text.trim()];
}

function takeSentences(sentences: string[], start: number, count: number): string {
  return sentences.slice(start, start + count).join(" ").trim();
}

function buildTourFromScript(ctx: PlaceContext, script: string): TourContent {
  const sentences = splitSentences(script);
  const welcomeCount = Math.min(3, Math.max(1, Math.ceil(sentences.length * 0.12)));
  const closingCount = Math.min(2, Math.max(1, Math.ceil(sentences.length * 0.08)));
  const welcome = takeSentences(sentences, 0, welcomeCount);
  const closing = takeSentences(sentences, Math.max(welcomeCount, sentences.length - closingCount), closingCount);
  const history = sentences
    .slice(welcomeCount, Math.max(welcomeCount + 1, sentences.length - closingCount))
    .join(" ")
    .trim();

  const curiosityPool = sentences.slice(welcomeCount + 2, welcomeCount + 12);
  const curiosities = [
    curiosityPool[0] || `${ctx.name} rewards a slower look; the details are part of the experience.`,
    curiosityPool[2] || `This stop is best understood through its atmosphere, not only its dates.`,
    curiosityPool[4] || `Listen for how the story of the place changes as you move through it.`,
  ].map((item) => item.replace(/^Here is something worth noticing\.\s*/i, ""));

  return {
    welcome,
    history,
    curiosities,
    mustSee: [
      {
        name: ctx.name,
        description: `Begin at the heart of ${ctx.name}. Take a moment to look around and let the scale, rhythm, and atmosphere settle in before moving on.`,
        type: "cultural",
      },
      {
        name: "Surrounding streets",
        description: "Move slowly through the nearby streets and notice how daily life, architecture, and small details frame the larger story of the place.",
        type: "neighborhood",
      },
      {
        name: "Best viewpoint",
        description: "Find a wider view when you can. It helps connect the landmarks, the movement of people, and the shape of the city around you.",
        type: "landmark",
      },
    ],
    localTips:
      "Take your time, keep the route flexible, and pause when something catches your eye. If you are visiting in person, check local opening hours and arrive earlier in the day for a calmer experience.",
    closing,
    sources: ctx.wikiExtract ? ["Wikipedia", "Gemini AI"] : ["Gemini AI"],
  };
}

export async function generateTourContent(ctx: PlaceContext): Promise<GeminiResult> {
  const model = getGeminiModel();
  const prompt = buildPrompt(ctx);

  try {
    const result = await model.generateContent(prompt);
    const script = cleanScript(result.response.text());

    if (!script) {
      throw new Error("Gemini returned an empty tour script.");
    }

    return {
      tour: buildTourFromScript(ctx, script),
      tokens: result.response.usageMetadata?.totalTokenCount ?? 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new Error(
        "Gemini quota is exhausted for this API key/model. Check billing/quota, wait for the retry window, or set GEMINI_MODEL in backend/.env."
      );
    }

    throw err;
  }
}
