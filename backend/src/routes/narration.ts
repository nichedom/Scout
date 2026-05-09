import { Router } from "express";
import { generateNarrationAudio } from "../services/elevenlabs";

const router = Router();

router.post("/generate", async (req, res) => {
  const { text, voiceId } = req.body as { text?: string; voiceId?: string };

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    const audio = await generateNarrationAudio({ text, voiceId });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audio.length);
    res.setHeader("Cache-Control", "no-store");
    return res.send(audio);
  } catch (err) {
    console.error("[narration] generation error:", err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
