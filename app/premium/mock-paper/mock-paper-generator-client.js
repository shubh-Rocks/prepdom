"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, ChevronDown, Loader2, Sparkles, Wand2 } from "lucide-react";

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MIN_SEM = 1;
const MAX_SEM = 12;
const EMPTY_OPTIONS = [];

const initialFormValues = {
  title: "",
  institute: "",
  specialization: "",
  subject: "",
  sem: "",
  sourcePaperId: "",
  year: String(new Date().getFullYear()),
};

function validate(values) {
  if (
    !values.title ||
    !values.subject ||
    !values.institute ||
    !values.specialization ||
    !values.sourcePaperId
  ) {
    return "Please complete all required fields.";
  }

  const sem = Number(values.sem);
  if (!Number.isInteger(sem) || sem < MIN_SEM || sem > MAX_SEM) {
    return "Semester must be between 1 and 12.";
  }

  const year = Number(values.year);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return "Year must be between 1900 and 2100.";
  }

  return null;
}

function SelectField({ label, value, onChange, options, placeholder, disabled = false, formatLabel }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-zinc-900">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full appearance-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 pr-11 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          required
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={String(option.value ?? option.id)} value={String(option.value ?? option.id)}>
              {formatLabel ? formatLabel(option) : option.label || option.value}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
    </label>
  );
}

export default function MockPaperGeneratorClient({ sourceOptions = [] }) {
  const router = useRouter();
  const [values, setValues] = useState(initialFormValues);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceYear = useMemo(() => {
    const year = Number(values.year);
    return Number.isInteger(year) ? year - 1 : "-";
  }, [values.year]);

  const selectedInstitute = useMemo(
    () => sourceOptions.find((option) => option.value === values.institute) || null,
    [sourceOptions, values.institute]
  );

  const specializationOptions = selectedInstitute?.specializations || EMPTY_OPTIONS;

  const selectedSpecialization = useMemo(
    () => specializationOptions.find((option) => option.value === values.specialization) || null,
    [specializationOptions, values.specialization]
  );

  const subjectOptions = selectedSpecialization?.subjects || EMPTY_OPTIONS;

  const selectedSubject = useMemo(
    () => subjectOptions.find((option) => option.value === values.subject) || null,
    [subjectOptions, values.subject]
  );

  const semesterOptions = selectedSubject?.semesters || EMPTY_OPTIONS;

  const selectedSemester = useMemo(
    () => semesterOptions.find((option) => String(option.value) === String(values.sem)) || null,
    [semesterOptions, values.sem]
  );

  const sourcePaperOptions = useMemo(() => {
    const targetSourceYear = Number(sourceYear);

    if (!selectedSemester || !Number.isInteger(targetSourceYear)) {
      return [];
    }

    return (selectedSemester.sourcePapers || []).filter((paper) => paper.year === targetSourceYear);
  }, [selectedSemester, sourceYear]);

  const selectedSourcePaper = useMemo(
    () => sourcePaperOptions.find((paper) => paper.id === values.sourcePaperId) || null,
    [sourcePaperOptions, values.sourcePaperId]
  );

  function updateField(field, nextValue) {
    setValues((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
    setFeedback(null);
  }

  function handleInstituteChange(event) {
    const nextInstitute = event.target.value;
    setValues((prev) => ({
      ...prev,
      institute: nextInstitute,
      specialization: "",
      subject: "",
      sem: "",
      sourcePaperId: "",
    }));
    setFeedback(null);
  }

  function handleSpecializationChange(event) {
    const nextSpecialization = event.target.value;
    setValues((prev) => ({
      ...prev,
      specialization: nextSpecialization,
      subject: "",
      sem: "",
      sourcePaperId: "",
    }));
    setFeedback(null);
  }

  function handleSubjectChange(event) {
    const nextSubject = event.target.value;
    setValues((prev) => ({
      ...prev,
      subject: nextSubject,
      sem: "",
      sourcePaperId: "",
    }));
    setFeedback(null);
  }

  function handleSemesterChange(event) {
    const nextSem = event.target.value;
    setValues((prev) => ({
      ...prev,
      sem: nextSem,
      sourcePaperId: "",
    }));
    setFeedback(null);
  }

  function handleYearChange(event) {
    const nextYear = event.target.value;
    setValues((prev) => ({
      ...prev,
      year: nextYear,
      sourcePaperId: "",
    }));
    setFeedback(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(null);

    const validationError = validate(values);
    if (validationError) {
      setFeedback({ type: "error", message: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/premium/mock-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          sem: Number(values.sem),
          year: Number(values.year),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.ok || !payload?.generationId || !payload?.paper) {
        throw new Error(payload?.error || "Mock paper generation failed.");
      }

      const storageKey = `mock-paper:${payload.generationId}`;
      window.sessionStorage.setItem(storageKey, JSON.stringify(payload.paper));

      startTransition(() => {
        router.push(`/premium/mock-paper/result?id=${encodeURIComponent(payload.generationId)}`);
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Mock paper generation failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.34)] backdrop-blur-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Generator Form</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
              Build your mock paper brief
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              This form mirrors the core paper metadata flow, then uses the previous year&apos;s approved
              extraction as the source pattern for generation.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Premium route
          </span>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-900">Mock paper title</span>
              <input
                type="text"
                value={values.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Operating Systems - Final Mock"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>

            <SelectField
              label="Institute"
              value={values.institute}
              onChange={handleInstituteChange}
              options={sourceOptions}
              placeholder="Choose institute"
            />

            <SelectField
              label="Specialization"
              value={values.specialization}
              onChange={handleSpecializationChange}
              options={specializationOptions}
              placeholder="Choose specialization"
              disabled={!values.institute}
            />

            <SelectField
              label="Subject"
              value={values.subject}
              onChange={handleSubjectChange}
              options={subjectOptions}
              placeholder="Choose subject"
              disabled={!values.specialization}
            />

            <SelectField
              label="Semester"
              value={values.sem}
              onChange={handleSemesterChange}
              options={semesterOptions}
              placeholder="Choose semester"
              disabled={!values.subject}
              formatLabel={(option) => `Sem ${option.value}`}
            />

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-900">Target year</span>
              <input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={values.year}
                onChange={handleYearChange}
                placeholder="2026"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                required
              />
            </label>

            <SelectField
              label="Source paper"
              value={values.sourcePaperId}
              onChange={(event) => updateField("sourcePaperId", event.target.value)}
              options={sourcePaperOptions}
              placeholder={
                Number.isInteger(Number(sourceYear))
                  ? `Choose ${sourceYear} paper`
                  : "Choose source paper"
              }
              disabled={!values.sem || sourcePaperOptions.length === 0}
              formatLabel={(option) => `${option.title} (${option.year})`}
            />
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-[linear-gradient(135deg,#f8fafc_0%,#f0fdf4_100%)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Source paper window</p>
                <p className="mt-2 text-lg font-bold text-zinc-900">Previous-year selector</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  The source paper dropdown only shows approved papers from <span className="font-semibold text-zinc-900">{sourceYear}</span> that match your selected institute, specialization, subject, and semester.
                </p>
                {values.sem && sourcePaperOptions.length === 0 ? (
                  <p className="mt-2 text-sm font-semibold text-amber-700">
                    No source papers are available for the selected path in {sourceYear}.
                  </p>
                ) : null}
                {selectedSourcePaper ? (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">
                    Selected source: {selectedSourcePaper.title} ({selectedSourcePaper.year})
                  </p>
                ) : null}
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Source year</p>
                <p className="mt-1 text-2xl font-black text-zinc-900">{sourceYear}</p>
              </div>
            </div>
          </div>

          {feedback ? (
            <div
              className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              role="status"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25671E] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1f5719] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {isSubmitting ? "Generating mock paper..." : "Generate mock paper"}
          </button>
        </form>
      </div>

      <aside className="rounded-[2rem] border border-zinc-200/80 bg-white/80 p-6 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">What you&apos;ll get</p>
        <div className="mt-4 space-y-4">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-900">Exam-style layout</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Sections, marks, compulsory logic, and overall paper pacing stay close to the source pattern.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-900">Question intelligence</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Each question includes topic, Bloom level, difficulty, learning objective, and estimated time.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-bold text-zinc-900">Interactive review</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Use quick section jumps, print-friendly layout, and outline copy tools on the result page.
            </p>
          </article>
        </div>

        <div className="mt-5 rounded-[1.75rem] bg-zinc-950 p-5 text-white">
          <p className="text-sm font-bold">Nested selection keeps the source precise.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Start with institute and narrow down step by step until you can choose the exact previous-year
            paper you want Gemini to imitate.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <ArrowRight className="h-4 w-4" />
            Final dropdown is filtered to the target year minus one
          </div>
        </div>
      </aside>
    </section>
  );
}
