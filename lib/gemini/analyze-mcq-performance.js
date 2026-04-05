import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  coerceMcqReportJson,
  getMcqReportResponseSchema,
  isStructuredMcqReportJson,
} from "@/lib/mcq-assessment-schema";

const GEMINI_MODEL = "gemini-2.5-flash";

function extractJsonCandidate(value) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    return "";
  }

  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeFenceMatch?.[1]) {
    return codeFenceMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function parseGeminiJson(value) {
  const candidate = extractJsonCandidate(value);

  if (!candidate) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(candidate);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
}

function createPrompt({ summaryInput }) {
  return [
    "You are an exam coach.",
    "Generate a short strengths and weaknesses report from the scoring summary.",
    "Do not change numeric values or invent scores.",
    "Return JSON only matching the schema.",
    "Use topic names exactly from input where possible.",
    "Provide practical, concise recommendations.",
    JSON.stringify(summaryInput),
  ].join(" ");
}

export async function analyzeMcqPerformance({ summaryInput }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const geminiResult = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: createPrompt({ summaryInput }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getMcqReportResponseSchema(),
    },
  });

  const raw = parseGeminiJson(geminiResult.response.text());
  const structured = coerceMcqReportJson(raw);

  if (!isStructuredMcqReportJson(structured)) {
    throw new Error("Gemini JSON did not match expected report structure.");
  }

  return {
    success: true,
    structured,
    model: GEMINI_MODEL,
  };
}
