const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeBloomDistribution(value) {
  const source = value && typeof value === "object" ? value : {};
  const distribution = {};

  for (const level of BLOOM_LEVELS) {
    const count = Number(source[level]);
    distribution[level] = Number.isFinite(count) && count >= 0 ? count : 0;
  }

  return distribution;
}

function normalizeDifficultyDistribution(value) {
  const source = value && typeof value === "object" ? value : {};
  const distribution = {};

  for (const level of DIFFICULTY_LEVELS) {
    const count = Number(source[level]);
    distribution[level] = Number.isFinite(count) && count >= 0 ? count : 0;
  }

  return distribution;
}

function normalizeUnitDistribution(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .map(([key, count]) => {
      const label = asString(key);
      const normalizedCount = Number(count);

      if (!label || !Number.isFinite(normalizedCount) || normalizedCount < 0) {
        return null;
      }

      return [label, normalizedCount];
    })
    .filter(Boolean);

  if (entries.length === 0) {
    return null;
  }

  return Object.fromEntries(entries);
}

function toSectionId(sectionIndex, rawValue) {
  const normalized = asString(rawValue);
  if (normalized) {
    return normalized;
  }

  return `section-${sectionIndex + 1}`;
}

function toQuestionId(sectionId, questionIndex, rawValue) {
  const normalized = asString(rawValue);
  if (normalized) {
    return normalized;
  }

  return `${sectionId}-q${questionIndex + 1}`;
}

export function getMockPaperResponseSchema() {
  return {
    type: "object",
    properties: {
      generation: {
        type: "object",
        properties: {
          sourcePaperId: { type: "string" },
          sourcePaperTitle: { type: "string" },
          sourceYear: { type: "number" },
          targetYear: { type: "number" },
          generatedAt: { type: "string" },
          model: { type: "string" },
          patternNotes: {
            type: "array",
            items: { type: "string" },
          },
          coverageNotes: {
            type: "array",
            items: { type: "string" },
          },
          difficultyStrategy: { type: "string" },
        },
        required: [
          "sourcePaperId",
          "sourcePaperTitle",
          "sourceYear",
          "targetYear",
          "generatedAt",
          "model",
          "patternNotes",
          "coverageNotes",
          "difficultyStrategy",
        ],
      },
      paper: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          subject: { type: "string" },
          subject_code: { type: "string" },
          semester: { type: "number", nullable: true },
          year: { type: "number", nullable: true },
          university: { type: "string" },
          duration_minutes: { type: "number", nullable: true },
          total_marks: { type: "number", nullable: true },
          instructions: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "id",
          "title",
          "subject",
          "subject_code",
          "semester",
          "year",
          "university",
          "duration_minutes",
          "total_marks",
          "instructions",
        ],
      },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string" },
            instruction: { type: "string" },
            marks_per_question: { type: "number", nullable: true },
            total_marks: { type: "number", nullable: true },
            is_compulsory: { type: "boolean" },
            attempt_out_of: { type: "number", nullable: true },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  number: { type: "string" },
                  text: { type: "string" },
                  marks: { type: "number", nullable: true },
                  has_choice: { type: "boolean" },
                  type: { type: "string" },
                  difficulty: { type: "string" },
                  bloom_level: { type: "string" },
                  topic: { type: "string" },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                  },
                  sub_questions: {
                    type: "array",
                    items: { type: "object" },
                  },
                  learning_objective: { type: "string" },
                  estimated_time_minutes: { type: "number", nullable: true },
                  examiner_note: { type: "string" },
                },
                required: [
                  "id",
                  "number",
                  "text",
                  "marks",
                  "has_choice",
                  "type",
                  "difficulty",
                  "bloom_level",
                  "topic",
                  "keywords",
                  "sub_questions",
                  "learning_objective",
                  "estimated_time_minutes",
                  "examiner_note",
                ],
              },
            },
          },
          required: [
            "id",
            "label",
            "instruction",
            "marks_per_question",
            "total_marks",
            "is_compulsory",
            "attempt_out_of",
            "questions",
          ],
        },
      },
      summary: {
        type: "object",
        properties: {
          total_marks: { type: "number", nullable: true },
          bloom_distribution: {
            type: "object",
            properties: {
              Remember: { type: "number" },
              Understand: { type: "number" },
              Apply: { type: "number" },
              Analyze: { type: "number" },
              Evaluate: { type: "number" },
              Create: { type: "number" },
            },
            required: BLOOM_LEVELS,
          },
          difficulty_distribution: {
            type: "object",
            properties: {
              easy: { type: "number" },
              medium: { type: "number" },
              hard: { type: "number" },
            },
            required: DIFFICULTY_LEVELS,
          },
          unit_distribution: {
            type: "object",
            nullable: true,
          },
        },
        required: ["total_marks", "bloom_distribution", "difficulty_distribution", "unit_distribution"],
      },
    },
    required: ["generation", "paper", "sections", "summary"],
  };
}

export function coerceMockPaperJson(input) {
  const source = input && typeof input === "object" ? input : {};
  const generation = source.generation && typeof source.generation === "object" ? source.generation : {};
  const paper = source.paper && typeof source.paper === "object" ? source.paper : {};
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const summary = source.summary && typeof source.summary === "object" ? source.summary : {};

  return {
    generation: {
      sourcePaperId: asString(generation.sourcePaperId),
      sourcePaperTitle: asString(generation.sourcePaperTitle),
      sourceYear: Number(asNullableNumber(generation.sourceYear) ?? 0),
      targetYear: Number(asNullableNumber(generation.targetYear) ?? 0),
      generatedAt: asString(generation.generatedAt),
      model: asString(generation.model),
      patternNotes: asStringArray(generation.patternNotes),
      coverageNotes: asStringArray(generation.coverageNotes),
      difficultyStrategy: asString(generation.difficultyStrategy),
    },
    paper: {
      id: asString(paper.id),
      title: asString(paper.title),
      subject: asString(paper.subject),
      subject_code: asString(paper.subject_code),
      semester: asNullableNumber(paper.semester),
      year: asNullableNumber(paper.year),
      university: asString(paper.university),
      duration_minutes: asNullableNumber(paper.duration_minutes),
      total_marks: asNullableNumber(paper.total_marks),
      instructions: asStringArray(paper.instructions),
    },
    sections: sections.map((rawSection, sectionIndex) => {
      const section = rawSection && typeof rawSection === "object" ? rawSection : {};
      const sectionId = toSectionId(sectionIndex, section.id);
      const questions = Array.isArray(section.questions) ? section.questions : [];

      return {
        id: sectionId,
        label: asString(section.label),
        instruction: asString(section.instruction),
        marks_per_question: asNullableNumber(section.marks_per_question),
        total_marks: asNullableNumber(section.total_marks),
        is_compulsory: typeof section.is_compulsory === "boolean" ? section.is_compulsory : true,
        attempt_out_of: asNullableNumber(section.attempt_out_of),
        questions: questions.map((rawQuestion, questionIndex) => {
          const question = rawQuestion && typeof rawQuestion === "object" ? rawQuestion : {};

          return {
            id: toQuestionId(sectionId, questionIndex, question.id),
            number: asString(question.number),
            text: asString(question.text),
            marks: asNullableNumber(question.marks),
            has_choice: Boolean(question.has_choice),
            type: asString(question.type),
            difficulty: asString(question.difficulty),
            bloom_level: asString(question.bloom_level),
            topic: asString(question.topic),
            keywords: asStringArray(question.keywords),
            sub_questions: Array.isArray(question.sub_questions) ? question.sub_questions : [],
            learning_objective: asString(question.learning_objective),
            estimated_time_minutes: asNullableNumber(question.estimated_time_minutes),
            examiner_note: asString(question.examiner_note),
          };
        }),
      };
    }),
    summary: {
      total_marks: asNullableNumber(summary.total_marks),
      bloom_distribution: normalizeBloomDistribution(summary.bloom_distribution),
      difficulty_distribution: normalizeDifficultyDistribution(summary.difficulty_distribution),
      unit_distribution: normalizeUnitDistribution(summary.unit_distribution),
    },
  };
}

export function isStructuredMockPaperJson(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (!value.generation || typeof value.generation !== "object") {
    return false;
  }

  if (!value.paper || typeof value.paper !== "object") {
    return false;
  }

  if (!Array.isArray(value.sections)) {
    return false;
  }

  if (!value.summary || typeof value.summary !== "object") {
    return false;
  }

  return true;
}
