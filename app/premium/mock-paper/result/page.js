import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { canAccessMockPaper, resolvePlanTierFromUser } from "@/lib/premium/plans";
import MockPaperResultClient from "./mock-paper-result-client";

export const dynamic = "force-dynamic";

export default async function MockPaperResultPage({ searchParams }) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/user/login?callbackUrl=/premium/mock-paper/result");
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id).select("isPremium planTier").lean();
  const planTier = resolvePlanTierFromUser(user || session.user);

  if (!canAccessMockPaper(planTier)) {
    redirect("/premium/plan");
  }

  const resolvedSearchParams = await searchParams;
  const generationId =
    typeof resolvedSearchParams?.id === "string" ? resolvedSearchParams.id.trim() : "";

  if (!generationId) {
    redirect("/premium/mock-paper");
  }

  return <MockPaperResultClient generationId={generationId} />;
}
