import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import MockPaperGeneration from "@/lib/models/MockPaperGeneration";
import { canAccessMockPaper, resolvePlanTierFromUser } from "@/lib/premium/plans";
import { analyzeMcqPerformance } from "@/lib/gemini/analyze-mcq-performance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asQuestions(value) {
  return Array.isArray(value) ? value : [];
}

function asAnswers(value) {
  return value && typeof value === "object" ? value : {};
}

function validatePayload(payload) {
  const generationId = asString(payload?.generationId);
  const answers = asAnswers(payload?.answers);

  if (!generationId) {
    return { error: "Missing generation id." };
  }

  if (!answers || typeof answers !== "object") {
    return { error: "Answers payload is invalid." };
  }

  return {
    value: {
      generationId,
      answers,
    },
  };
}

function toPercentage(correct, total) {
  if (!total) {
    return 0;
  }

  return Number(((correct / total) * 100).toFixed(2));
}

function toTopicBreakdown(questions, answers) {
  const stats = new Map();

  for (const question of questions) {
    const topic = asString(question?.topic) || "General";
    const correctOption = asString(question?.correctOption).toUpperCase();
    const selectedOption = asString(answers[question.id]).toUpperCase();

    if (!stats.has(topic)) {
      stats.set(topic, {
        topic,
        total: 0,
        correct: 0,
      });
    }

    const current = stats.get(topic);
    current.total += 1;

    if (selectedOption && selectedOption === correctOption) {
      current.correct += 1;
    }
  }

  const rows = Array.from(stats.values()).map((item) => ({
    ...item,
    percentage: toPercentage(item.correct, item.total),
  }));

  rows.sort((a, b) => b.percentage - a.percentage || b.total - a.total);
  return rows;
}

function toDifficultyBreakdown(questions, answers) {
  const stats = {
    easy: { total: 0, correct: 0, percentage: 0 },
    medium: { total: 0, correct: 0, percentage: 0 },
    hard: { total: 0, correct: 0, percentage: 0 },
  };

  for (const question of questions) {
    const difficulty = asString(question?.difficulty).toLowerCase();
    const bucket = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "medium";

    const correctOption = asString(question?.correctOption).toUpperCase();
    const selectedOption = asString(answers[question.id]).toUpperCase();

    stats[bucket].total += 1;

    if (selectedOption && selectedOption === correctOption) {
      stats[bucket].correct += 1;
    }
  }

  for (const key of Object.keys(stats)) {
    const value = stats[key];
    value.percentage = toPercentage(value.correct, value.total);
  }

  return stats;
}

function buildDeterministicResult({ generationId, questions, answers }) {
  let correctCount = 0;
  let answeredCount = 0;

  const perQuestion = questions.map((question) => {
    const questionId = asString(question?.id);
    const selectedOption = asString(answers[questionId]).toUpperCase();
    const correctOption = asString(question?.correctOption).toUpperCase();
    const isAnswered = Boolean(selectedOption);
    const isCorrect = isAnswered && selectedOption === correctOption;

    if (isAnswered) {
      answeredCount += 1;
    }

    if (isCorrect) {
      correctCount += 1;
    }

    return {
      questionId,
      topic: asString(question?.topic) || "General",
      difficulty: asString(question?.difficulty).toLowerCase() || "medium",
      selectedOption,
      correctOption,
      isCorrect,
    };
  });

  const totalQuestions = questions.length;
  const percentage = toPercentage(correctCount, totalQuestions);
  const topicBreakdown = toTopicBreakdown(questions, answers);
  const difficultyBreakdown = toDifficultyBreakdown(questions, answers);

  const strongTopics = topicBreakdown
    .filter((topic) => topic.percentage >= 75)
    .map((topic) => topic.topic);
  const weakTopics = topicBreakdown
    .filter((topic) => topic.percentage < 50)
    .map((topic) => topic.topic);

  return {
    generationId,
    totalQuestions,
    answeredCount,
    correctCount,
    incorrectCount: totalQuestions - correctCount,
    percentage,
    topicBreakdown,
    difficultyBreakdown,
    strongTopics,
    weakTopics,
    perQuestion,
  };
}

export async function POST(request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Please sign in to continue." },
      { status: 401 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const validated = validatePayload(payload);

  if (validated.error) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const user = await User.findById(session.user.id).select("isPremium planTier").lean();
  const planTier = resolvePlanTierFromUser(user || session.user);

  if (!canAccessMockPaper(planTier)) {
    return NextResponse.json(
      { ok: false, error: "Upgrade to Premium to access this test." },
      { status: 403 }
    );
  }

  const { value } = validated;

  const generation = await MockPaperGeneration.findOne({
    generationId: value.generationId,
    user: session.user.id,
  })
    .select("mcqTestJson")
    .lean();

  const questions = asQuestions(generation?.mcqTestJson?.questions);

  if (!questions.length) {
    return NextResponse.json(
      { ok: false, error: "No generated MCQ test found for this mock paper." },
      { status: 404 }
    );
  }

  const deterministic = buildDeterministicResult({
    generationId: value.generationId,
    questions,
    answers: value.answers,
  });

  try {
    const aiReport = await analyzeMcqPerformance({
      summaryInput: {
        generationId: value.generationId,
        totalQuestions: deterministic.totalQuestions,
        answeredCount: deterministic.answeredCount,
        correctCount: deterministic.correctCount,
        incorrectCount: deterministic.incorrectCount,
        percentage: deterministic.percentage,
        topicBreakdown: deterministic.topicBreakdown,
        difficultyBreakdown: deterministic.difficultyBreakdown,
        strongTopics: deterministic.strongTopics,
        weakTopics: deterministic.weakTopics,
      },
    });

    return NextResponse.json({
      ok: true,
      report: {
        deterministic,
        ai: aiReport.structured,
        model: aiReport.model,
      },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      report: {
        deterministic,
        ai: {
          summary:
            "Your score is based on exact answer matching. Focus revision on low-scoring topics and retake the test to improve consistency.",
          strongTopics: deterministic.strongTopics,
          weakTopics: deterministic.weakTopics,
          recommendations: [
            "Review incorrect questions first and note why each option was wrong.",
            "Revise weak topics with short active-recall sessions.",
            "Retake this same test after revision to measure improvement.",
          ],
        },
        model: "fallback",
      },
    });
  }
}
