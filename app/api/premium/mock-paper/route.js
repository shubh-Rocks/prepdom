import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import Paper from "@/lib/models/Paper";
import PaperExtraction from "@/lib/models/PaperExtraction";
import { APPROVED_PAPER_STATUS } from "@/lib/library/config";
import { canAccessMockPaper, resolvePlanTierFromUser } from "@/lib/premium/plans";
import User from "@/lib/models/User";
import { generateMockPaper } from "@/lib/gemini/generate-mock-paper";
import MockPaperGeneration from "@/lib/models/MockPaperGeneration";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MIN_SEM = 1;
const MAX_SEM = 12;

function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

function validatePayload(payload) {
  const title = asTrimmedString(payload?.title);
  const subject = asTrimmedString(payload?.subject);
  const institute = asTrimmedString(payload?.institute);
  const specialization = asTrimmedString(payload?.specialization);
  const sourcePaperId = asTrimmedString(payload?.sourcePaperId);
  const sem = asNumber(payload?.sem);
  const year = asNumber(payload?.year);

  if (!title || !subject || !institute || !specialization || !sourcePaperId) {
    return { error: "Please complete all required fields." };
  }

  if (!isValidObjectId(sourcePaperId)) {
    return { error: "Choose a valid source paper." };
  }

  if (!Number.isInteger(sem) || sem < MIN_SEM || sem > MAX_SEM) {
    return { error: "Semester must be between 1 and 12." };
  }

  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { error: "Year must be between 1900 and 2100." };
  }

  return {
    value: {
      title,
      subject,
      institute,
      specialization,
      sourcePaperId,
      sem,
      year,
      sourceYear: year - 1,
    },
  };
}

export async function POST(request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Please sign in to generate a mock paper." },
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
      { ok: false, error: "Upgrade to Premium to generate mock papers." },
      { status: 403 }
    );
  }

  const { value } = validated;

  const sourcePaper = await Paper.findOne({
    _id: value.sourcePaperId,
    status: APPROVED_PAPER_STATUS,
    subject: value.subject,
    institute: value.institute,
    specialization: value.specialization,
    sem: value.sem,
    year: value.sourceYear,
    hasExtraction: true,
    extractionStatus: "completed",
  })
    .select("title year subject institute specialization sem")
    .lean();

  if (!sourcePaper?._id) {
    return NextResponse.json(
      {
        ok: false,
        error: `The selected ${value.sourceYear} source paper is unavailable for this subject profile.`,
      },
      { status: 404 }
    );
  }

  const extraction = await PaperExtraction.findOne({
    paper: sourcePaper._id,
    status: "completed",
  })
    .select("extractedJson")
    .lean();

  if (!extraction?.extractedJson || typeof extraction.extractedJson !== "object") {
    return NextResponse.json(
      { ok: false, error: "The matched source paper does not have usable extraction data." },
      { status: 409 }
    );
  }

  try {
    const generationId = crypto.randomUUID();

    const result = await generateMockPaper({
      sourcePaper: extraction.extractedJson,
      sourcePaperId: String(sourcePaper._id),
      sourceTitle: sourcePaper.title || `${value.subject} ${value.sourceYear}`,
      sourceYear: value.sourceYear,
      targetYear: value.year,
      formValues: value,
    });

    await MockPaperGeneration.create({
      generationId,
      user: session.user.id,
      sourcePaper: sourcePaper._id,
      mockPaperJson: result.structured,
    });

    return NextResponse.json({
      ok: true,
      generationId,
      paper: result.structured,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Mock paper generation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
