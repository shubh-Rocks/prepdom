import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  coerceMcqGenerationJson,
  getMcqGenerationResponseSchema,
  isStructuredMcqGenerationJson,
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

function createPrompt({ mockPaper, questionCount }) {
  return [
    "Generate a multiple-choice test from the provided mock exam JSON.",
    "Return only JSON matching the schema.",
    `Create exactly ${questionCount} MCQs.`,
    "Each question must include one correct option and three plausible distractors.",
    "Distribute questions across major topics from the mock paper.",
    "Keep wording exam-like and concise.",
    "Include difficulty as easy, medium, or hard.",
    "Include a short explanation for the correct answer.",
    "Use option keys A, B, C, D.",
    "Avoid repeating the same concept more than twice.",
    "Mock paper JSON:",
    JSON.stringify(mockPaper),
  ].join(" ");
}

export async function generateMcqTest({ mockPaper, questionCount = 20 }) {
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
            text: createPrompt({
              mockPaper,
              questionCount,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getMcqGenerationResponseSchema(),
    },
  });

  const raw = parseGeminiJson(geminiResult.response.text());
  const structured = coerceMcqGenerationJson(raw, questionCount);

  if (!isStructuredMcqGenerationJson(structured, questionCount)) {
    throw new Error("Gemini JSON did not match expected MCQ structure.");
  }

  return {
    success: true,
    structured,
    model: GEMINI_MODEL,
  };
}
