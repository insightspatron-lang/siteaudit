import type { WebsiteAnalysis } from "@/lib/scoring";

const SYSTEM_PROMPT = `You are an expert B2B website analyst. Your task is to audit small business websites and identify concrete improvement opportunities.

Respond ONLY with valid JSON matching this exact schema. No markdown, no explanation.

{
  "score": number,          // 0-100, higher = more opportunity
  "strengths": string[],    // 2-5 short bullet points
  "weaknesses": string[],   // 2-7 short bullet points
  "recommendations": string[], // 3-6 prioritized, actionable items
  "outreach_message": string   // 2-3 sentence personalized cold outreach pitch
}`;

interface AiAuditOutput {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  outreach_message: string;
}

/**
 * Runs an AI-powered audit via OpenAI (or any OpenAI-compatible endpoint).
 * Only called when OPENAI_API_KEY is present and valid.
 */
export async function runAiAudit(
  url: string,
  content: WebsiteAnalysis
): Promise<AiAuditOutput> {
  const { default: OpenAI } = await import("openai");

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? "dummy",
    baseURL: process.env.OPENAI_BASE_URL, // optional, for OpenRouter/Groq/etc.
  });

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Website URL: ${url}\n\nWebsite Analysis:\n` +
          JSON.stringify(content, null, 2),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 2048,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as AiAuditOutput;

  return {
    score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
    outreach_message:
      typeof parsed.outreach_message === "string"
        ? parsed.outreach_message
        : "",
  };
}
