"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Loader2,
  Printer,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

function formatDistributionEntries(distribution) {
  if (!distribution || typeof distribution !== "object") {
    return [];
  }

  return Object.entries(distribution).filter(([, count]) => Number(count) > 0);
}

function formatOutline(paper) {
  const lines = [
    `${paper.paper.title || "Mock Paper"}`,
    `${paper.paper.subject || "Subject"} | ${paper.paper.university || "University"} | ${paper.paper.year || "-"}`,
    "",
  ];

  for (const section of paper.sections || []) {
    lines.push(`${section.label || "Section"}${section.instruction ? ` - ${section.instruction}` : ""}`);

    for (const question of section.questions || []) {
      lines.push(
        `${question.number || "Q"}: ${question.text} (${question.marks ?? "-"} marks, ${question.difficulty || "n/a"})`
      );
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

function QuestionChip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
      {children}
    </span>
  );
}

export default function MockPaperResultClient({ generationId }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");

  const resolvedPaper = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        status: "loading",
        paper: null,
      };
    }

    const storageKey = `mock-paper:${generationId}`;
    const raw = window.sessionStorage.getItem(storageKey);

    if (!raw) {
      return {
        status: "missing",
        paper: null,
      };
    }

    try {
      return {
        status: "ready",
        paper: JSON.parse(raw),
      };
    } catch {
      return {
        status: "missing",
        paper: null,
      };
    }
  }, [generationId]);

  const { paper, status } = resolvedPaper;

  const outline = useMemo(() => (paper ? formatOutline(paper) : ""), [paper]);
  const bloomEntries = useMemo(
    () => formatDistributionEntries(paper?.summary?.bloom_distribution),
    [paper]
  );
  const difficultyEntries = useMemo(
    () => formatDistributionEntries(paper?.summary?.difficulty_distribution),
    [paper]
  );
  const unitEntries = useMemo(
    () => formatDistributionEntries(paper?.summary?.unit_distribution),
    [paper]
  );

  async function handleCopyOutline() {
    if (!outline) {
      return;
    }

    try {
      await navigator.clipboard.writeText(outline);
      setFeedback("Outline copied to clipboard.");
    } catch {
      setFeedback("Could not copy the outline on this device.");
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleRegenerate() {
    router.push("/premium/mock-paper");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_14%_18%,rgba(22,163,74,0.1),transparent_34%),linear-gradient(160deg,#f7fbf8_0%,#eef8ff_100%)] px-5 py-10 sm:px-8">
        <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl items-center justify-center rounded-[2rem] border border-zinc-200 bg-white/85 p-8 shadow-[0_24px_80px_-34px_rgba(15,23,42,0.34)]">
          <div className="inline-flex items-center gap-3 text-sm font-semibold text-zinc-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening generated mock paper...
          </div>
        </main>
      </div>
    );
  }

  if (status === "missing" || !paper) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_14%_18%,rgba(22,163,74,0.1),transparent_34%),linear-gradient(160deg,#f7fbf8_0%,#eef8ff_100%)] px-5 py-10 sm:px-8">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-[2rem] border border-zinc-200 bg-white/85 p-8 text-center shadow-[0_24px_80px_-34px_rgba(15,23,42,0.34)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Mock paper not found</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              This result lives only for the current session. Generate it again to reopen the interactive
              paper view.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/premium/mock-paper"
              className="inline-flex items-center gap-2 rounded-full bg-[#25671E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f5719]"
            >
              <RefreshCcw className="h-4 w-4" />
              Generate again
            </Link>
            <Link
              href="/user/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_14%,rgba(22,163,74,0.1),transparent_32%),radial-gradient(circle_at_88%_8%,rgba(14,165,233,0.12),transparent_28%),linear-gradient(160deg,#f6fbf7_0%,#f7fafc_44%,#edf6ff_100%)] px-4 py-8 sm:px-8 print:bg-white print:px-0 print:py-0">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 print:max-w-none">
        <header className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_24px_90px_-34px_rgba(15,23,42,0.34)] backdrop-blur-sm print:rounded-none print:border-0 print:shadow-none sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/premium/mock-paper"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 print:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to generator
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Generated mock paper
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
                {paper.paper?.title || "Mock Paper"}
              </h1>
              <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">
                Built from <span className="font-semibold text-zinc-900">{paper.generation?.sourcePaperTitle || "previous-year paper"}</span>
                {" "}({paper.generation?.sourceYear || "-"}) for {paper.paper?.subject || "your subject"}.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <QuestionChip>{paper.paper?.subject || "Subject"}</QuestionChip>
                <QuestionChip>{paper.paper?.university || "University"}</QuestionChip>
                <QuestionChip>Sem {paper.paper?.semester ?? "-"}</QuestionChip>
                <QuestionChip>{paper.paper?.year ?? "-"}</QuestionChip>
                <QuestionChip>{paper.paper?.total_marks ?? "-"} marks</QuestionChip>
                <QuestionChip>{paper.paper?.duration_minutes ?? "-"} mins</QuestionChip>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={handleCopyOutline}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                <Clipboard className="h-4 w-4" />
                Copy outline
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-2 rounded-full bg-[#25671E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f5719]"
              >
                <RefreshCcw className="h-4 w-4" />
                Regenerate
              </button>
            </div>
          </div>

          {feedback ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 print:hidden">
              <Sparkles className="h-4 w-4" />
              {feedback}
            </div>
          ) : null}
        </header>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr] print:grid-cols-1">
          <aside className="space-y-5 print:hidden">
            <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Quick jump</p>
              <div className="mt-4 space-y-2">
                {(paper.sections || []).map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <span>{section.label || "Section"}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Generation notes</p>
              <details className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3" open>
                <summary className="cursor-pointer text-sm font-bold text-zinc-900">Pattern notes</summary>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                  {(paper.generation?.patternNotes || []).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>
              <details className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3" open>
                <summary className="cursor-pointer text-sm font-bold text-zinc-900">Coverage notes</summary>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                  {(paper.generation?.coverageNotes || []).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>
              <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                <p className="font-bold text-zinc-900">Difficulty strategy</p>
                <p className="mt-2">{paper.generation?.difficultyStrategy || "No strategy notes provided."}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Paper summary</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Bloom split</p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-700">
                    {bloomEntries.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span>{label}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Difficulty split</p>
                  <div className="mt-3 space-y-2 text-sm text-zinc-700">
                    {difficultyEntries.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="capitalize">{label}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {unitEntries.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Unit coverage</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {unitEntries.map(([label, count]) => (
                      <QuestionChip key={label}>{label}: {count}</QuestionChip>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-[2rem] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Instructions</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
                    {(paper.paper?.instructions || []).map((instruction) => (
                      <p key={instruction} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                        {instruction}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Source provenance</p>
                  <div className="mt-3 rounded-[1.75rem] bg-zinc-950 p-5 text-sm leading-6 text-zinc-300">
                    <p>
                      <span className="font-semibold text-white">Source paper:</span>{" "}
                      {paper.generation?.sourcePaperTitle || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Source year:</span>{" "}
                      {paper.generation?.sourceYear || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Target year:</span>{" "}
                      {paper.generation?.targetYear || "-"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Model:</span>{" "}
                      {paper.generation?.model || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(paper.sections || []).map((section) => (
              <article
                id={section.id}
                key={section.id}
                className="rounded-[2rem] border border-zinc-200 bg-white/92 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)] print:break-inside-avoid print:rounded-none print:border print:shadow-none sm:p-7"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                      {section.label || "Section"}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
                      {section.label || "Question set"}
                    </h2>
                    {section.instruction ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{section.instruction}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.total_marks !== null ? <QuestionChip>{section.total_marks} marks</QuestionChip> : null}
                    {section.marks_per_question !== null ? (
                      <QuestionChip>{section.marks_per_question} each</QuestionChip>
                    ) : null}
                    {section.attempt_out_of !== null ? (
                      <QuestionChip>Attempt {section.attempt_out_of}</QuestionChip>
                    ) : null}
                    <QuestionChip>{section.is_compulsory ? "Compulsory" : "Choice-based"}</QuestionChip>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {(section.questions || []).map((question) => (
                    <div key={question.id} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/80 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                            {question.number || "Question"}
                          </p>
                          <p className="mt-2 text-base font-semibold leading-7 text-zinc-900">
                            {question.text || "Question text unavailable."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {question.marks !== null ? <QuestionChip>{question.marks} marks</QuestionChip> : null}
                          {question.estimated_time_minutes !== null ? (
                            <QuestionChip>{question.estimated_time_minutes} min</QuestionChip>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {question.topic ? <QuestionChip>{question.topic}</QuestionChip> : null}
                        {question.difficulty ? <QuestionChip>{question.difficulty}</QuestionChip> : null}
                        {question.bloom_level ? <QuestionChip>{question.bloom_level}</QuestionChip> : null}
                        {question.type ? <QuestionChip>{question.type}</QuestionChip> : null}
                        {question.has_choice ? <QuestionChip>Choice</QuestionChip> : null}
                      </div>

                      {question.learning_objective ? (
                        <div className="mt-4 rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm leading-6 text-zinc-700">
                          <p className="font-bold text-zinc-900">Learning objective</p>
                          <p className="mt-1">{question.learning_objective}</p>
                        </div>
                      ) : null}

                      {question.examiner_note ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                          <p className="font-bold">Examiner note</p>
                          <p className="mt-1">{question.examiner_note}</p>
                        </div>
                      ) : null}

                      {Array.isArray(question.sub_questions) && question.sub_questions.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                          <p className="text-sm font-bold text-zinc-900">Sub-questions</p>
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                            {JSON.stringify(question.sub_questions, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {Array.isArray(question.keywords) && question.keywords.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {question.keywords.map((keyword) => (
                            <QuestionChip key={keyword}>{keyword}</QuestionChip>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </section>
      </main>
    </div>
  );
}
