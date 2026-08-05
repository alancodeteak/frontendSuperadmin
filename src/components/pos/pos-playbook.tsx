"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  PosPlaybookDef,
  PosPlaybookField,
  PosPlaybookStep,
} from "@/lib/pos/playbook-copy";
import { cn } from "@/lib/utils";

type GuidePageId =
  | "overview"
  | "steps"
  | "fields"
  | "examples"
  | "faq";

const PAGE_META: {
  id: GuidePageId;
  label: string;
  short: string;
}[] = [
  { id: "overview", label: "1. Overview", short: "Overview" },
  { id: "steps", label: "2. Steps", short: "Steps" },
  { id: "fields", label: "3. Fields & values", short: "Fields" },
  { id: "examples", label: "4. Examples", short: "Examples" },
  { id: "faq", label: "5. FAQ", short: "FAQ" },
];

function FieldCard({
  field,
  forceOpen,
}: {
  field: PosPlaybookField;
  forceOpen?: boolean | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen === true) setOpen(true);
    if (forceOpen === false) setOpen(false);
  }, [forceOpen]);

  const fives: { label: string; q: string; a: string }[] = [
    { label: "What", q: "What is this?", a: field.what },
    { label: "Why", q: "Why does it matter?", a: field.why },
    { label: "Who", q: "Who sets or uses it?", a: field.who },
    { label: "When", q: "When do I set or change it?", a: field.when },
    { label: "Where", q: "Where do I find it?", a: field.where },
    {
      label: "How",
      q: "How do I fill, check, analyse, and update it?",
      a: field.how,
    },
  ];

  return (
    <div className="rounded-xl border border-border/80 bg-background/70">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-semibold tracking-tight">{field.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {field.meaning}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              <ChevronUpIcon className="size-3.5" />
              Hide 5Ws
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-3.5" />
              Open 5Ws
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 border-t px-3 py-3 text-xs leading-relaxed">
          <div className="space-y-2">
            {fives.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  {item.label} — {item.q}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Real-life workflow
            </p>
            <p className="mt-1 text-muted-foreground">{field.workflow}</p>
          </div>

          <div className="rounded-lg bg-muted/60 px-3 py-2 font-mono text-[11px] leading-relaxed">
            <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Example value
            </p>
            <p className="break-all text-foreground">{field.example}</p>
            {field.exampleAlt ? (
              <>
                <p className="mb-1 mt-2 font-sans text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Another common value
                </p>
                <p className="break-all text-foreground">{field.exampleAlt}</p>
              </>
            ) : null}
          </div>

          {field.commonMistakes ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive">
              <span className="font-semibold">Common mistake: </span>
              {field.commonMistakes}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function PosPlaybook({
  playbook,
  title,
  description,
  steps,
  fields,
  callout,
  defaultOpen = false,
  className,
}: {
  playbook?: PosPlaybookDef;
  title?: string;
  description?: string;
  steps?: PosPlaybookStep[];
  fields?: PosPlaybookField[];
  callout?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [page, setPage] = useState<GuidePageId>("overview");
  const [fieldsForceOpen, setFieldsForceOpen] = useState<boolean | null>(null);

  const resolvedTitle = playbook?.title ?? title ?? "Playbook";
  const resolvedDescription = playbook?.description ?? description;
  const resolvedSteps = playbook?.steps ?? steps ?? [];
  const resolvedFields = playbook?.fields ?? fields ?? [];
  const examples = playbook?.examples ?? [];
  const faqs = playbook?.faqs ?? [];

  const availablePages = useMemo(() => {
    return PAGE_META.filter((p) => {
      if (p.id === "overview") return true;
      if (p.id === "steps") return resolvedSteps.length > 0;
      if (p.id === "fields") return resolvedFields.length > 0;
      if (p.id === "examples") return examples.length > 0;
      if (p.id === "faq") return faqs.length > 0;
      return false;
    });
  }, [resolvedSteps.length, resolvedFields.length, examples.length, faqs.length]);

  const pageIndex = availablePages.findIndex((p) => p.id === page);
  const safeIndex = pageIndex >= 0 ? pageIndex : 0;
  const currentPage = availablePages[safeIndex]?.id ?? "overview";

  function goPage(id: GuidePageId) {
    setPage(id);
  }

  function goPrev() {
    const next = availablePages[safeIndex - 1];
    if (next) setPage(next.id);
  }

  function goNext() {
    const next = availablePages[safeIndex + 1];
    if (next) setPage(next.id);
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/35 bg-amber-500/5 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <BookOpenIcon
            className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Beginner guide
            </p>
            <p className="font-semibold tracking-tight">{resolvedTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Open → Fields & values → Open 5Ws on each field (What, Why, Who,
              When, Where, How + real-life workflow).
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-amber-500/40 bg-background/70"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? (
            <>
              <ChevronUpIcon className="size-3.5" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDownIcon className="size-3.5" />
              Open guide
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-amber-500/20 px-4 py-4">
          {callout ? (
            <div className="rounded-lg border border-amber-500/25 bg-background/60 px-3 py-2 text-sm">
              {callout}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {availablePages.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={currentPage === p.id ? "default" : "outline"}
                onClick={() => goPage(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="min-h-[12rem] rounded-xl border bg-background/70 px-4 py-4">
            {currentPage === "overview" ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold tracking-tight">
                  Overview
                </h3>
                {resolvedDescription ? (
                  <p className="max-w-3xl leading-relaxed text-muted-foreground">
                    {resolvedDescription}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Use the page buttons above. Start with{" "}
                    <strong className="text-foreground">Examples</strong> if you
                    already know the vendor, or{" "}
                    <strong className="text-foreground">Fields & values</strong>{" "}
                    to learn each input.
                  </p>
                )}
                <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Steps</strong> — order of
                    clicks for this screen.
                  </li>
                  <li>
                    <strong className="text-foreground">Fields & values</strong>{" "}
                    — tap <strong className="text-foreground">Open 5Ws</strong>{" "}
                    on each field (What / Why / Who / When / Where / How +
                    workflow).
                  </li>
                  <li>
                    <strong className="text-foreground">Examples</strong> —
                    copy-paste values by real situation.
                  </li>
                  <li>
                    <strong className="text-foreground">FAQ</strong> — common
                    beginner questions.
                  </li>
                </ul>
                <Button type="button" size="sm" onClick={() => goPage("fields")}>
                  Go to Fields & values
                  <ChevronRightIcon className="size-3.5" />
                </Button>
              </div>
            ) : null}

            {currentPage === "steps" ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold tracking-tight">
                  Steps (do in order)
                </h3>
                <ol className="list-decimal space-y-3 pl-5">
                  {resolvedSteps.map((step, i) => (
                    <li key={step.title} className="leading-relaxed">
                      <span className="font-medium">
                        {i + 1}. {step.title}
                      </span>
                      {step.detail ? (
                        <p className="mt-1 text-muted-foreground">
                          {step.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {currentPage === "fields" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight">
                      Fields & values (5Ws)
                    </h3>
                    <p className="mt-1 text-muted-foreground">
                      Each card is one form field or config key. Click{" "}
                      <strong className="text-foreground">Open 5Ws</strong> for:
                      What, Why, Who, When, Where, How (fill / analyse /
                      update), a real-life workflow story, and example values.
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setFieldsForceOpen(true)}
                    >
                      Expand all 5Ws
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFieldsForceOpen(false)}
                    >
                      Collapse all
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {resolvedFields.map((field) => (
                    <FieldCard
                      key={field.name}
                      field={field}
                      forceOpen={fieldsForceOpen}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {currentPage === "examples" ? (
              <div className="space-y-4">
                <h3 className="text-base font-semibold tracking-tight">
                  Examples by scenario
                </h3>
                <p className="text-muted-foreground">
                  Find your situation, then copy the field values into the
                  matching section tabs on the config card.
                </p>
                {examples.map((ex) => (
                  <div
                    key={ex.title}
                    className="rounded-xl border border-border/80 bg-muted/20 px-4 py-3"
                  >
                    <p className="font-semibold tracking-tight">{ex.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Situation:{" "}
                      </span>
                      {ex.situation}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        What to do:{" "}
                      </span>
                      {ex.whatToDo}
                    </p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-1.5 pr-3 font-medium">Field</th>
                            <th className="py-1.5 font-medium">
                              Put this value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.values.map((row) => (
                            <tr
                              key={`${ex.title}-${row.field}`}
                              className="border-b border-border/50 align-top"
                            >
                              <td className="py-2 pr-3 font-medium">
                                {row.field}
                              </td>
                              <td className="py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {currentPage === "faq" ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold tracking-tight">FAQ</h3>
                <dl className="space-y-3">
                  {faqs.map((item) => (
                    <div
                      key={item.q}
                      className="rounded-xl border bg-muted/20 px-4 py-3"
                    >
                      <dt className="font-semibold">{item.q}</dt>
                      <dd className="mt-1.5 leading-relaxed text-muted-foreground">
                        {item.a}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/15 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeIndex <= 0}
              onClick={goPrev}
            >
              <ChevronLeftIcon className="size-3.5" />
              Previous page
            </Button>
            <p className="text-xs text-muted-foreground">
              Page {safeIndex + 1} of {availablePages.length}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeIndex >= availablePages.length - 1}
                onClick={goNext}
              >
                Next page
                <ChevronRightIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                <ChevronUpIcon className="size-3.5" />
                Collapse
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
