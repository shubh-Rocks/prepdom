const ALLOWED_DIFFICULTY = ["easy", "medium", "hard"];
const OPTION_KEYS = ["A", "B", "C", "D"];

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeOptions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const options = value
    .map((option, index) => {
      const source = option && typeof option === "object" ? option : {};
      const key = asString(source.key || OPTION_KEYS[index]).toUpperCase();
      const text = asString(source.text);

      if (!OPTION_KEYS.includes(key) || !text) {
        return null;
      }

      return { key, text };
    })
    .filter(Boolean);

  if (options.length < 4) {
    return [];
  }

  return OPTION_KEYS.map((key) => options.find((option) => option.key === key)).filter(Boolean);
}

function normalizeDifficulty(value) {
  const normalized = asString(value).toLowerCase();
  return ALLOWED_DIFFICULTY.includes(normalized) ? normalized : "medium";
}

function toQuestionId(index, value) {
  const normalized = asString(value);
  return normalized || `mcq-${index + 1}`;
}

export function getMcqGenerationResponseSchema() {
  return {
    type: "object",
    properties: {
      testTitle: { type: "string" },
      instructions: {
        type: "array",
        items: { type: "string" },
      },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            topic: { type: "string" },
            difficulty: { type: "string" },
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  text: { type: "string" },
                },
                required: ["key", "text"],
              },
            },
            correctOption: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["id", "question", "topic", "difficulty", "options", "correctOption", "explanation"],
        },
      },
    },
    required: ["testTitle", "instructions", "questions"],
  };
}

export function coerceMcqGenerationJson(input, expectedCount = 20) {
  const source = input && typeof input === "object" ? input : {};
  const questions = Array.isArray(source.questions) ? source.questions : [];

  const normalizedQuestions = questions
    .slice(0, expectedCount)
    .map((rawQuestion, index) => {
      const question = rawQuestion && typeof rawQuestion === "object" ? rawQuestion : {};
      const options = normalizeOptions(question.options);
      const correctOption = asString(question.correctOption).toUpperCase();

      return {
        id: toQuestionId(index, question.id),
        question: asString(question.question),
        topic: asString(question.topic) || "General",
        difficulty: normalizeDifficulty(question.difficulty),
        options,
        correctOption: OPTION_KEYS.includes(correctOption) ? correctOption : "A",
        explanation: asString(question.explanation),
      };
    })
    .filter((question) => {
      if (!question.question || question.options.length !== 4) {
        return false;
      }

      return question.options.some((option) => option.key === question.correctOption);
    });

  return {
    testTitle: asString(source.testTitle) || "Mock Paper Skills Test",
    instructions: asStringArray(source.instructions),
    questions: normalizedQuestions,
  };
}

export function isStructuredMcqGenerationJson(value, expectedCount = 20) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!Array.isArray(value.questions) || value.questions.length !== expectedCount) {
    return false;
  }

  return value.questions.every((question) => {
    if (!question || typeof question !== "object") {
      return false;
    }

    if (!question.id || !question.question || !question.topic || !question.correctOption) {
      return false;
    }

    if (!ALLOWED_DIFFICULTY.includes(question.difficulty)) {
      return false;
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      return false;
    }

    const keys = question.options.map((option) => option.key);
    return OPTION_KEYS.every((key) => keys.includes(key));
  });
}

export function getMcqReportResponseSchema() {
  return {
    type: "object",
    properties: {
      summary: { type: "string" },
      strongTopics: {
        type: "array",
        items: { type: "string" },
      },
      weakTopics: {
        type: "array",
        items: { type: "string" },
      },
      recommendations: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["summary", "strongTopics", "weakTopics", "recommendations"],
  };
}

export function coerceMcqReportJson(input) {
  const source = input && typeof input === "object" ? input : {};

  return {
    summary: asString(source.summary),
    strongTopics: asStringArray(source.strongTopics).slice(0, 6),
    weakTopics: asStringArray(source.weakTopics).slice(0, 6),
    recommendations: asStringArray(source.recommendations).slice(0, 6),
  };
}

export function isStructuredMcqReportJson(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!value.summary) {
    return false;
  }

  if (!Array.isArray(value.strongTopics) || !Array.isArray(value.weakTopics)) {
    return false;
  }

  if (!Array.isArray(value.recommendations)) {
    return false;
  }

  return true;
}
