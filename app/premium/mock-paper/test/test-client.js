"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";

const TEST_STORAGE_PREFIX = "mock-paper-mcq:";

function toRoundedPercentage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Number(parsed.toFixed(2));
}

function OptionButton({ option, selected, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.key)}
      disabled={disabled}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
        selected
          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400",
        disabled ? "cursor-not-allowed opacity-70" : "",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs font-bold">
          {option.key}
        </span>
        <span>{option.text}</span>
      </span>
    </button>
  );
}

function ScoreCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-zinc-900">{value}</p>
      {helper ? <p className="mt-1 text-xs font-medium text-zinc-600">{helper}</p> : null}
    </div>
  );
}

export default function MockPaperMcqTestClient({ generationId }) {
  const [testState, setTestState] = useState({ status: "idle", test: null, message: "" });
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reportState, setReportState] = useState({ status: "idle", report: null, message: "" });
  const [generationAttempt, setGenerationAttempt] = useState(0);

  useEffect(() => {
    const persisted = window.sessionStorage.getItem(`${TEST_STORAGE_PREFIX}${generationId}`);

    if (persisted) {
      try {
        const parsed = JSON.parse(persisted);
        if (Array.isArray(parsed?.questions) && parsed.questions.length === 20) {
          setTestState({ status: "ready", test: parsed, message: "" });
          return;
        }
      } catch {
        window.sessionStorage.removeItem(`${TEST_STORAGE_PREFIX}${generationId}`);
      }
    }

    let cancelled = false;

    async function generateTest() {
      setTestState({ status: "generating", test: null, message: "Generating 20 MCQs from your mock paper..." });

      try {
        const response = await fetch("/api/premium/mock-paper/mcq", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId,
            questionCount: 20,
          }),
        });

        const payload = await response.json();

        if (!response.ok || !payload?.ok || !payload?.test?.questions?.length) {
          throw new Error(payload?.error || "Unable to generate MCQ test.");
        }

        if (cancelled) {
          return;
        }

        window.sessionStorage.setItem(
          `${TEST_STORAGE_PREFIX}${generationId}`,
          JSON.stringify(payload.test)
        );
        setTestState({ status: "ready", test: payload.test, message: "" });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setTestState({
          status: "error",
          test: null,
          message: error instanceof Error ? error.message : "Unable to generate MCQ test.",
        });
      }
    }

    generateTest();

    return () => {
      cancelled = true;
    };
  }, [generationId, generationAttempt]);

  const questions = testState.test?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  function handleSelect(optionKey) {
    if (!currentQuestion?.id) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionKey,
    }));
  }

  function moveToNext() {
    setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  }

  function moveToPrev() {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  function handleRetake() {
    setAnswers({});
    setCurrentIndex(0);
    setReportState({ status: "idle", report: null, message: "" });
  }

  function handleRetryGeneration() {
    setGenerationAttempt((prev) => prev + 1);
  }

  async function handleSubmit() {
    if (!allAnswered || reportState.status === "submitting") {
      return;
    }

    setReportState({ status: "submitting", report: null, message: "Analyzing your answers..." });

    try {
      const response = await fetch("/api/premium/mock-paper/mcq/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId,
          answers,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok || !payload?.report?.deterministic) {
        throw new Error(payload?.error || "Could not evaluate your performance.");
      }

      setReportState({ status: "ready", report: payload.report, message: "" });
    } catch (error) {
      setReportState({
        status: "error",
        report: null,
        message: error instanceof Error ? error.message : "Could not evaluate your performance.",
      });
    }
  }

  if (testState.status === "idle" || testState.status === "generating") {
    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f6fbf7_0%,#f7fafc_44%,#edf6ff_100%)] px-4 py-10 sm:px-8">
        <main className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-4 rounded-4xl border border-zinc-200 bg-white/90 p-8 text-center shadow-[0_24px_80px_-34px_rgba(15,23,42,0.34)]">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Creating your MCQ test</h1>
          <p className="max-w-xl text-sm leading-6 text-zinc-600">
            We are preparing 20 questions from your generated mock paper. This takes a few seconds.
          </p>
        </main>
      </div>
    );
  }

  if (testState.status === "error") {
    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f6fbf7_0%,#f7fafc_44%,#edf6ff_100%)] px-4 py-10 sm:px-8">
        <main className="mx-auto max-w-3xl rounded-4xl border border-zinc-200 bg-white/90 p-8 text-center shadow-[0_24px_80px_-34px_rgba(15,23,42,0.34)]">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-zinc-900">Could not generate test</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{testState.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleRetryGeneration}
              className="inline-flex items-center gap-2 rounded-full bg-[#25671E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f5719]"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
            <Link
              href={`/premium/mock-paper/result?id=${encodeURIComponent(generationId)}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to result
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (reportState.status === "ready" && reportState.report) {
    const deterministic = reportState.report.deterministic;
    const ai = reportState.report.ai;

    return (
      <div className="min-h-screen bg-[linear-gradient(160deg,#f6fbf7_0%,#f7fafc_44%,#edf6ff_100%)] px-4 py-8 sm:px-8">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <header className="rounded-4xl border border-zinc-200 bg-white/90 p-6 shadow-[0_24px_90px_-34px_rgba(15,23,42,0.34)] sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Performance report
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
              You scored {toRoundedPercentage(deterministic.percentage)}%
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
              {ai?.summary || "Here is your topic-wise and difficulty-wise performance summary."}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ScoreCard label="Correct" value={deterministic.correctCount} helper="Right answers" />
            <ScoreCard label="Incorrect" value={deterministic.incorrectCount} helper="Needs revision" />
            <ScoreCard
              label="Attempted"
              value={`${deterministic.answeredCount}/${deterministic.totalQuestions}`}
              helper="Answered questions"
            />
            <ScoreCard label="Accuracy" value={`${toRoundedPercentage(deterministic.percentage)}%`} />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-4xl border border-zinc-200 bg-white/92 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Topic performance</p>
              <div className="mt-4 space-y-2">
                {deterministic.topicBreakdown.map((topic) => (
                  <div
                    key={topic.topic}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-zinc-800">{topic.topic}</span>
                    <span className="font-bold text-zinc-900">
                      {topic.correct}/{topic.total} ({toRoundedPercentage(topic.percentage)}%)
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-4xl border border-zinc-200 bg-white/92 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Difficulty split</p>
              <div className="mt-4 space-y-2">
                {Object.entries(deterministic.difficultyBreakdown).map(([level, score]) => (
                  <div
                    key={level}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold capitalize text-zinc-800">{level}</span>
                    <span className="font-bold text-zinc-900">
                      {score.correct}/{score.total} ({toRoundedPercentage(score.percentage)}%)
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-4xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Strong fields</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(ai?.strongTopics?.length ? ai.strongTopics : deterministic.strongTopics).map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
                  >
                    {topic}
                  </span>
                ))}
                {!ai?.strongTopics?.length && !deterministic.strongTopics.length ? (
                  <span className="text-sm text-emerald-900">Keep practicing to build stronger topic consistency.</span>
                ) : null}
              </div>
            </article>

            <article className="rounded-4xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Needs work</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(ai?.weakTopics?.length ? ai.weakTopics : deterministic.weakTopics).map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {topic}
                  </span>
                ))}
                {!ai?.weakTopics?.length && !deterministic.weakTopics.length ? (
                  <span className="text-sm text-amber-900">No weak topics detected in this attempt.</span>
                ) : null}
              </div>
            </article>
          </section>

          <section className="rounded-4xl border border-zinc-200 bg-white/92 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Study recommendations</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-700">
              {(ai?.recommendations || []).map((item) => (
                <li key={item} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="inline-flex items-center gap-2 rounded-full bg-[#25671E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f5719]"
            >
              <RotateCcw className="h-4 w-4" />
              Retake same test
            </button>
            <Link
              href={`/premium/mock-paper/result?id=${encodeURIComponent(generationId)}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to result
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#f6fbf7_0%,#f7fafc_44%,#edf6ff_100%)] px-4 py-8 sm:px-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="rounded-4xl border border-zinc-200 bg-white/90 p-6 shadow-[0_24px_90px_-34px_rgba(15,23,42,0.34)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Test your understanding
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-900">MCQ Skills Test</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Answer one question at a time. Once all 20 are answered, submit to get your score and topic-wise analysis.
              </p>
            </div>
            <Link
              href={`/premium/mock-paper/result?id=${encodeURIComponent(generationId)}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to result
            </Link>
          </div>
        </header>

        <section className="rounded-4xl border border-zinc-200 bg-white/92 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-700">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <p className="text-sm font-semibold text-zinc-700">Answered: {answeredCount}/{totalQuestions}</p>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            />
          </div>

          {currentQuestion ? (
            <div className="mt-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                {currentQuestion.topic} | {currentQuestion.difficulty}
              </p>
              <h2 className="text-xl font-bold leading-8 text-zinc-900">{currentQuestion.question}</h2>
              <div className="space-y-3">
                {(currentQuestion.options || []).map((option) => (
                  <OptionButton
                    key={option.key}
                    option={option}
                    selected={answers[currentQuestion.id] === option.key}
                    onSelect={handleSelect}
                    disabled={reportState.status === "submitting"}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={moveToPrev}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={moveToNext}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25671E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f5719]"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered || reportState.status === "submitting"}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportState.status === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting
                  </>
                ) : (
                  "Submit test"
                )}
              </button>
            </div>
          </div>

          {reportState.status === "error" ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {reportState.message}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

