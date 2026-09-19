import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getGeminiModel() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return model;
}

export function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error("Could not parse AI JSON response");
  }
}

export async function generateWithRetry(
  prompt: string,
  retries = 2,
  delayMs = 1000,
) {
  const gemini = getGeminiModel();
  if (!gemini) throw new Error("Gemini not configured");
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await gemini.generateContent(prompt);
      return await result.response;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const message = err instanceof Error ? err.message : String(err);
      const isTransient =
        message.includes("503") || message.includes("overloaded");
      if (isLastAttempt || !isTransient) throw err;
      console.log(
        `Gemini call failed (attempt ${attempt + 1}/${retries + 1}), retrying...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Gemini call failed");
}
