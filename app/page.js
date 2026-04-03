import Link from "next/link";
import { ArrowRight, Coins, FileText, Sparkles, UserCircle2 } from "lucide-react";
import SignOutButton from "@/app/components/auth/sign-out-button";
import { getAuthSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getAuthSession();

  const quickStats = [
    {
      label: "Papers Uploaded",
      value: "0",
      icon: FileText,
    },
    {
      label: "Coins Available",
      value: String(session?.user?.coins ?? 0),
      icon: Coins,
    },
    {
      label: "Mock Ready",
      value: "Gemini JSON",
      icon: Sparkles,
    },
  ];

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#e0f2fe_0%,transparent_40%),radial-gradient(circle_at_90%_20%,#d9f99d_0%,transparent_38%),linear-gradient(145deg,#f8fafc_0%,#eef2ff_48%,#f0fdf4_100%)] px-5 py-10 sm:px-8">
      <div className="absolute -left-16 top-20 h-52 w-52 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="absolute -right-12 bottom-16 h-64 w-64 rounded-full bg-lime-200/45 blur-3xl" />

      <main className="relative z-10 flex w-full max-w-5xl flex-col gap-8 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.32)] backdrop-blur-md sm:p-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Prepdom Platform</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Student papers to mocks, powered by Gemini.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              Upload exam papers, extract structured question JSON, unlock premium content with coins, and
              generate realistic mock papers in seconds.
            </p>
          </div>

          {session?.user ? (
            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <UserCircle2 className="h-8 w-8 text-zinc-700" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">{session.user.name}</p>
                <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
              </div>
            </div>
          ) : null}
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {quickStats.map((item) => (
            <article key={item.label} className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm">
              <item.icon className="h-5 w-5 text-zinc-700" />
              <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">{item.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{item.label}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {session?.user ? (
            <>
              <Link
                href="/user/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/user/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Sign in with Google
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
