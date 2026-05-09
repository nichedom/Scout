interface NarrationOptions {
  text: string;
  voiceId?: string;
}

const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";
const MAX_NARRATION_CHARS = 5000;

function cleanEnv(value: string | undefined): string {
  return value?.trim().replace(/^["']|["']$/g, "") ?? "";
}

function getElevenLabsConfig() {
  const apiKey = cleanEnv(process.env.ELEVENLABS_API_KEY);
  const defaultVoiceId = cleanEnv(process.env.ELEVENLABS_VOICE_ID);
  const modelId = cleanEnv(process.env.ELEVENLABS_MODEL) || "eleven_multilingual_v2";

  if (!apiKey || apiKey === "your_elevenlabs_api_key_here") {
    throw new Error("ELEVENLABS_API_KEY is missing in backend/.env.");
  }

  if (!defaultVoiceId) {
    throw new Error("ELEVENLABS_VOICE_ID is missing in backend/.env.");
  }

  return { apiKey, defaultVoiceId, modelId };
}

export async function generateNarrationAudio({ text, voiceId }: NarrationOptions): Promise<Buffer> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Narration text is required.");
  }

  if (trimmed.length > MAX_NARRATION_CHARS) {
    throw new Error(`Narration text is too long. Keep it under ${MAX_NARRATION_CHARS} characters for now.`);
  }

  const { apiKey, defaultVoiceId, modelId } = getElevenLabsConfig();
  const selectedVoiceId = voiceId?.trim() || defaultVoiceId;
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream`);
  url.searchParams.set("output_format", DEFAULT_OUTPUT_FORMAT);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: trimmed,
      model_id: modelId,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `ElevenLabs request failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  return Buffer.from(await response.arrayBuffer());
}
