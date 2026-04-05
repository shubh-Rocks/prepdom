import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import MockPaperGeneration from "@/lib/models/MockPaperGeneration";
import { canAccessMockPaper, resolvePlanTierFromUser } from "@/lib/premium/plans";
import { generateMcqTest } from "@/lib/gemini/generate-mcq-test";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_QUESTION_COUNT = 20;
const MAX_QUESTION_COUNT = 20;

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validatePayload(payload) {
  const questionCount = asNumber(payload?.questionCount) ?? DEFAULT_QUESTION_COUNT;
  const generationId =
    typeof payload?.generationId === "string" ? payload.generationId.trim() : "";

  if (!generationId) {
    return { error: "Missing generation id." };
  }

  if (!Number.isInteger(questionCount) || questionCount !== MAX_QUESTION_COUNT) {
    return { error: "Question count must be exactly 20." };
  }

  return {
    value: {
      generationId,
      questionCount,
    },
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
    .select("mockPaperJson mcqTestJson mcqModel")
    .lean();

  if (!generation?.mockPaperJson || typeof generation.mockPaperJson !== "object") {
    return NextResponse.json(
      { ok: false, error: "Could not find generated mock paper context for this test." },
      { status: 404 }
    );
  }

  if (
    generation.mcqTestJson &&
    Array.isArray(generation.mcqTestJson.questions) &&
    generation.mcqTestJson.questions.length === value.questionCount
  ) {
    return NextResponse.json({
      ok: true,
      generationId: value.generationId,
      test: generation.mcqTestJson,
    });
  }

  try {
    const result = await generateMcqTest({
      mockPaper: generation.mockPaperJson,
      questionCount: value.questionCount,
    });

    const testPayload = {
      id: `mcq-test:${value.generationId}`,
      generatedAt: new Date().toISOString(),
      model: result.model,
      testTitle: result.structured.testTitle,
      instructions: result.structured.instructions,
      questions: result.structured.questions,
    };

    await MockPaperGeneration.updateOne(
      { generationId: value.generationId, user: session.user.id },
      {
        $set: {
          mcqTestJson: testPayload,
          mcqModel: result.model,
          mcqGeneratedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      ok: true,
      generationId: value.generationId,
      test: testPayload,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "MCQ generation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
