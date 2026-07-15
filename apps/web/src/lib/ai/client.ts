import OpenAI from "openai";

// Google AI Studio (Gemini) exposes an OpenAI-compatible endpoint, so the
// `openai` SDK works unchanged with a different baseURL + key.
export const ai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Fallback chain: tried in order. If one model is rate-limited (HTTP 429)
// or errors, the next is tried. Ordered cheap/fast -> more capable, since
// both our jobs (classification, filter extraction) are light. Override the
// whole list from the environment without a code change, e.g.
//   GEMINI_MODELS=gemini-3-flash,gemini-2.5-flash,gemini-2.5-flash-lite
// Check Google AI Studio for the exact model names available to your key.
// NOTE: the "-latest" aliases are the ones actually served over the
// OpenAI-compatible endpoint with free-tier quota. The versioned ids like
// gemini-2.5-flash 404 here, and gemini-2.0-flash has zero free quota on
// some projects. These aliases also auto-track Google's current model, so
// they won't break when a version is retired.
export const AI_MODELS = (
  process.env.GEMINI_MODELS ?? "gemini-flash-latest,gemini-flash-lite-latest"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

type CompletionArgs = Omit<
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  "model"
>;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  // 404 = this model name doesn't exist for the key (retired/renamed) -> try
  // the next one. 429 = rate limited. 5xx = transient. All should fall
  // through to the next model rather than kill the whole request.
  return (
    status === 404 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

// Runs a chat completion against the fallback chain. Throws only if every
// model in the chain fails.
export async function chatWithFallback(args: CompletionArgs) {
  let lastError: unknown;

  for (const model of AI_MODELS) {
    try {
      return await ai.chat.completions.create({ ...args, model });
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
      // otherwise fall through to the next model
    }
  }

  throw lastError ?? new Error("No AI models configured (GEMINI_MODELS is empty)");
}

// Gemini's OpenAI-compat layer doesn't reliably honor structured tool-calls,
// so we prompt for plain JSON and parse it ourselves.
export function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
