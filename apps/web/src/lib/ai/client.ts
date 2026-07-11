import OpenAI from "openai";

// build.nvidia.com exposes an OpenAI-compatible chat completions API for its
// hosted NIM models (Llama 3.3 70B Instruct by default here), so the
// `openai` SDK works as-is with a different baseURL + key.
export const ai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export const AI_MODEL = process.env.NVIDIA_MODEL ?? "meta/llama-3.3-70b-instruct";

// Open-weights models served this way don't reliably support OpenAI's
// `tools`/function-calling parameter, so we ask for plain JSON and parse it
// ourselves rather than depending on structured tool-call output.
export function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
