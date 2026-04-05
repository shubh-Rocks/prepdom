import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  coerceMockPaperJson,
  getMockPaperResponseSchema,
  isStructuredMockPaperJson,
} from "@/lib/mock-paper-schema";

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

function createPrompt({ sourcePaper, sourceTitle, sourcePaperId, sourceYear, targetYear, formValues }) {
  return [
    "You are generating a brand-new university mock exam from a real previous-year paper JSON.",
    "Return only JSON matching the provided response schema.",
    "Preserve the exam's structure, section sequencing, mark logic, and approximate cognitive distribution.",
    "Do not copy or lightly paraphrase source questions.",
    "Generate fresh, plausible questions for the same subject and academic context.",
    "Keep instructions concise and exam-like.",
    "Set generation.sourcePaperId to the supplied source paper id.",
    "Set generation.sourcePaperTitle to the supplied source paper title.",
    "Set generation.sourceYear to the supplied source year and generation.targetYear to the supplied target year.",
    "Set generation.generatedAt to the current ISO timestamp string.",
    "Set generation.model to the model name already used for this run.",
    "Use form metadata as the target context when naming the paper.",
    `Target title: ${formValues.title}.`,
    `Target subject: ${formValues.subject}.`,
    `Target institute/university: ${formValues.institute}.`,
    `Target specialization: ${formValues.specialization}.`,
    `Target semester: ${formValues.sem}.`,
    `Source paper id: ${sourcePaperId}.`,
    `Source paper title: ${sourceTitle}.`,
    `Source year: ${sourceYear}.`,
    `Target year: ${targetYear}.`,
    "Include 2-4 patternNotes and 2-4 coverageNotes.",
    "For each question include learning_objective, estimated_time_minutes, and examiner_note.",
    "If the source paper has choices, preserve similar optionality patterns.",
    "Use the source JSON below as the pattern reference.",
    JSON.stringify(sourcePaper),
  ].join(" ");
}

export async function generateMockPaper({
  sourcePaper,
  sourcePaperId,
  sourceTitle,
  sourceYear,
  targetYear,
  formValues,
}) {
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
              sourcePaper,
              sourceTitle,
              sourcePaperId,
              sourceYear,
              targetYear,
              formValues,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: getMockPaperResponseSchema(),
    },
  });

  const raw = parseGeminiJson(geminiResult.response.text());
  const structured = coerceMockPaperJson(raw);

  if (!isStructuredMockPaperJson(structured)) {
    throw new Error("Gemini JSON did not match expected mock paper structure.");
  }

  structured.generation = {
    ...structured.generation,
    sourcePaperId,
    sourcePaperTitle: sourceTitle,
    sourceYear,
    targetYear,
    generatedAt: structured.generation.generatedAt || new Date().toISOString(),
    model: structured.generation.model || GEMINI_MODEL,
  };

  structured.paper = {
    ...structured.paper,
    title: structured.paper.title || formValues.title,
    subject: structured.paper.subject || formValues.subject,
    semester: structured.paper.semester ?? formValues.sem,
    year: structured.paper.year ?? targetYear,
    university: structured.paper.university || formValues.institute,
  };

  return {
    success: true,
    structured,
    model: GEMINI_MODEL,
  };
}
