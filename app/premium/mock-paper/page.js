import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBadge, Sparkles } from "lucide-react";
import { getAuthSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  canAccessMockPaper,
  hasAllPapersFreeAccess,
  resolvePlanTierFromUser,
} from "@/lib/premium/plans";

export default async function MockPaperPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/user/login?callbackUrl=/premium/mock-paper");
  }

  await connectToDatabase();
  const user = await User.findById(session.user.id)
    .select("isPremium planTier")
    .lean();
  const planTier = resolvePlanTierFromUser(user || session.user);

  if (!canAccessMockPaper(planTier)) {
    redirect("/premium/plan");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f8fafc_0%,#ecfeff_45%,#f0fdf4_100%)] px-5 py-10 sm:px-8">
      <main className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_22px_80px_-28px_rgba(15,23,42,0.28)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Premium Mock Papers
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          Mock paper generator
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          You are now on the premium mock-paper route. The generator workflow
          can be connected here next.
        </p>

        <form className="mt-6 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="university"
              className="block text-sm font-semibold text-zinc-700"
            >
              University / College Name
            </label>
            <input
              type="text"
              id="university"
              name="university"
              placeholder="e.g., University of Delhi"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="program"
              className="block text-sm font-semibold text-zinc-700"
            >
              Program
            </label>
            <select
              id="program"
              name="program"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            >
              <option value="">Select a program</option>
              <option value="b-tech">B.Tech (Bachelor of Technology)</option>
              <option value="b-sc">B.Sc (Bachelor of Science)</option>
              <option value="b-a">B.A (Bachelor of Arts)</option>
              <option value="b-com">B.Com (Bachelor of Commerce)</option>
              <option value="b-ca">
                B.CA (Bachelor of Computer Applications)
              </option>
              <option value="m-tech">M.Tech (Master of Technology)</option>
              <option value="m-sc">M.Sc (Master of Science)</option>
              <option value="mba">
                MBA (Master of Business Administration)
              </option>
              <option value="diploma">Diploma</option>
            </select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="specialization"
              className="block text-sm font-semibold text-zinc-700"
            >
              Specialization
            </label>
            <select
              id="specialization"
              name="specialization"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            >
              <option value="">Select a specialization</option>
              <option value="cse">Computer Science & Engineering</option>
              <option value="ai-ml">
                AI/ML (Artificial Intelligence & Machine Learning)
              </option>
              <option value="data-science">Data Science</option>
              <option value="iot">IoT (Internet of Things)</option>
              <option value="cybersecurity">Cybersecurity</option>
              <option value="web-dev">Web Development</option>
              <option value="cloud-computing">Cloud Computing</option>
              <option value="devops">DevOps</option>
              <option value="mechanical">Mechanical Engineering</option>
              <option value="civil">Civil Engineering</option>
              <option value="electrical">Electrical Engineering</option>
              <option value="electronics">Electronics & Communication</option>
              <option value="chemical">Chemical Engineering</option>
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="mathematics">Mathematics</option>
              <option value="biology">Biology</option>
              <option value="commerce">Commerce</option>
              <option value="economics">Economics</option>
            </select>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="subject"
              className="block text-sm font-semibold text-zinc-700"
            >
              Subject Name
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              placeholder="e.g., Physics, Mathematics, Chemistry"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="syllabus"
              className="block text-sm font-semibold text-zinc-700"
            >
              Syllabus (PDF File)
            </label>
            <input
              type="file"
              id="syllabus"
              name="syllabus"
              accept=".pdf"
              className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-[#006045] file:cursor-pointer file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:hover:bg-[#0d542b] "
              required
            />
            <p className="text-xs text-zinc-500">Max file size: 10MB</p>
          </div>

          <button
            type="submit"
            className="mt-4 flex items-center justify-center gap-2 rounded-lg cursor-pointer bg-[#006045] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#0d542b] focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <Sparkles size={18} />
            Generate Mock Paper
          </button>
        </form>

        {hasAllPapersFreeAccess(planTier) && (
          <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Premium Plus detected: all papers are free to access for your
            account.
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-zinc-700">
          <Link
            href="/premium/plan"
            className="underline decoration-zinc-300 underline-offset-4"
          >
            Manage Plan
          </Link>
          <Link
            href="/user/dashboard"
            className="underline decoration-zinc-300 underline-offset-4"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
