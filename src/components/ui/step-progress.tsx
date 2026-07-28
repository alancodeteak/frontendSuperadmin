"use client";

import gsap from "gsap";
import { CheckIcon } from "lucide-react";
import { Fragment, useLayoutEffect, useMemo, useRef } from "react";

import {
  STEP_PROGRESS_CIRCLE_SIZE,
  STEP_PROGRESS_COMPLETED_COLOR,
  STEP_PROGRESS_LABEL_COLOR,
  STEP_PROGRESS_LINE_HEIGHT,
  STEP_PROGRESS_NUMBER_COLOR,
  STEP_PROGRESS_TRACK_COLOR,
  STEP_PROGRESS_VERTICAL_CONNECTOR_MIN_HEIGHT,
} from "@/constants/step-progress";
import { cn } from "@/lib/utils";

export type StepProgressOrientation = "horizontal" | "vertical";

export interface StepProgressStep {
  id?: string;
  label: string;
  /** Optional supporting text — mainly useful in vertical layout. */
  description?: string;
}

export interface StepProgressProps {
  steps: StepProgressStep[];
  /**
   * 0-based index of the active step.
   * Steps before this are completed; this step and later are upcoming.
   * Pass `steps.length` to mark every step completed.
   */
  currentStep: number;
  /**
   * 0–1 fill on the connector leading into `currentStep`
   * (from the previous completed step). Ignored for step 0 / all-complete.
   */
  progress?: number;
  /** Layout direction. Default: horizontal. */
  orientation?: StepProgressOrientation;
  className?: string;
  onStepClick?: (index: number) => void;
}

type StepState = "completed" | "active" | "upcoming";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getStepState(index: number, currentStep: number): StepState {
  if (index < currentStep) return "completed";
  if (index === currentStep) return "active";
  return "upcoming";
}

function getConnectorFill(
  connectorIndex: number,
  currentStep: number,
  progress: number,
): number {
  if (currentStep <= 0) return 0;
  if (currentStep >= connectorIndex + 2) return 1;
  if (currentStep === connectorIndex + 1) return progress;
  return 0;
}

function CheckIconMark({ className }: { className?: string }) {
  return <CheckIcon className={className} strokeWidth={2.5} aria-hidden />;
}

function StepCircle({
  index,
  state,
  label,
  clickable,
  onClick,
}: {
  index: number;
  state: StepState;
  label: string;
  clickable: boolean;
  onClick?: () => void;
}) {
  const circleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = circleRef.current;
    if (!el || prefersReducedMotion()) return;

    gsap.fromTo(
      el,
      { scale: 0.92, opacity: 0.85 },
      { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.6)" },
    );
  }, [state]);

  const content =
    state === "completed" ? (
      <CheckIconMark className="size-4 text-white" />
    ) : (
      <span className="text-[14px] font-semibold tabular-nums">{index + 1}</span>
    );

  const circle = (
    <span
      ref={circleRef}
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full border-2 bg-muted/30 transition-colors",
        state === "completed" && "border-transparent text-white",
        state === "active" &&
          "border-emerald-500 bg-muted/30 text-foreground",
        state === "upcoming" &&
          "border-gray-300 bg-muted/30 text-gray-500",
      )}
      style={{
        width: STEP_PROGRESS_CIRCLE_SIZE,
        height: STEP_PROGRESS_CIRCLE_SIZE,
        ...(state === "completed"
          ? { backgroundColor: STEP_PROGRESS_COMPLETED_COLOR }
          : {}),
      }}
    >
      {content}
    </span>
  );

  if (!clickable || !onClick) {
    return circle;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`Go to step ${index + 1}: ${label}`}
    >
      {circle}
    </button>
  );
}

function Connector({
  orientation,
  fillRef,
  className,
}: {
  orientation: StepProgressOrientation;
  fillRef: (el: HTMLDivElement | null) => void;
  className?: string;
}) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full",
        isHorizontal ? "h-[3px] w-full" : "h-full w-[3px]",
        className,
      )}
      style={{
        backgroundColor: STEP_PROGRESS_TRACK_COLOR,
        ...(isHorizontal
          ? {}
          : { minHeight: STEP_PROGRESS_VERTICAL_CONNECTOR_MIN_HEIGHT }),
      }}
      aria-hidden
    >
      <div
        ref={fillRef}
        className={cn(
          "absolute rounded-full",
          isHorizontal
            ? "inset-y-0 left-0 w-full origin-left"
            : "inset-x-0 top-0 h-full origin-top",
        )}
        style={{
          backgroundColor: STEP_PROGRESS_COMPLETED_COLOR,
          transform: isHorizontal ? "scaleX(0)" : "scaleY(0)",
        }}
      />
    </div>
  );
}

export function StepProgress({
  steps,
  currentStep,
  progress = 0.35,
  orientation = "horizontal",
  className,
  onStepClick,
}: StepProgressProps) {
  const connectorFillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const isHorizontal = orientation === "horizontal";

  const connectorFills = useMemo(
    () =>
      steps.slice(0, -1).map((_, index) =>
        getConnectorFill(index, currentStep, clampedProgress),
      ),
    [steps, currentStep, clampedProgress],
  );

  useLayoutEffect(() => {
    connectorFillRefs.current.forEach((el, index) => {
      if (!el) return;
      const fill = connectorFills[index] ?? 0;
      const props = isHorizontal
        ? { scaleX: fill, transformOrigin: "left center" }
        : { scaleY: fill, transformOrigin: "top center" };

      if (prefersReducedMotion()) {
        gsap.set(el, props);
        return;
      }

      gsap.to(el, {
        ...props,
        duration: 0.45,
        ease: "power2.out",
      });
    });
  }, [connectorFills, isHorizontal]);

  if (steps.length === 0) return null;

  if (isHorizontal) {
    const stepCount = steps.length;
    const circleOverlap = STEP_PROGRESS_CIRCLE_SIZE / 2;
    const gridColumns = `repeat(${Math.max(stepCount * 2 - 1, 1)}, minmax(0, 1fr))`;

    return (
      <nav
        aria-label="Progress"
        className={cn(
          "w-full max-w-none border-0 bg-transparent p-0 shadow-none ring-0",
          className,
        )}
      >
        <div
          className="grid w-full gap-y-3"
          style={{ gridTemplateColumns: gridColumns }}
        >
          {steps.map((step, index) => {
            const state = getStepState(index, currentStep);
            const clickable = state === "completed" && Boolean(onStepClick);
            const circleColumn = index * 2 + 1;

            return (
              <Fragment key={step.id ?? step.label}>
                {index > 0 ? (
                  <div
                    className="z-0 flex items-center self-center"
                    style={{
                      gridColumn: index * 2,
                      gridRow: 1,
                      marginInline: -circleOverlap,
                    }}
                    aria-hidden
                  >
                    <Connector
                      orientation="horizontal"
                      className="h-[3px] w-full"
                      fillRef={(el) => {
                        connectorFillRefs.current[index - 1] = el;
                      }}
                    />
                  </div>
                ) : null}

                <div
                  className="relative z-10 flex justify-center"
                  style={{ gridColumn: circleColumn, gridRow: 1 }}
                >
                  <StepCircle
                    index={index}
                    state={state}
                    label={step.label}
                    clickable={clickable}
                    onClick={
                      clickable ? () => onStepClick?.(index) : undefined
                    }
                  />
                </div>

                <div
                  className="min-w-0 px-1 text-center"
                  style={{ gridColumn: circleColumn, gridRow: 2 }}
                >
                  <p
                    className={cn(
                      "text-[12px] font-semibold leading-4 sm:text-[13px]",
                      state === "active"
                        ? "text-foreground"
                        : "text-[color:var(--step-label)]",
                    )}
                    style={{
                      ["--step-label" as string]: STEP_PROGRESS_LABEL_COLOR,
                    }}
                  >
                    {step.label}
                  </p>
                  {step.description ? (
                    <p className="mt-1 hidden text-[11px] leading-4 text-muted-foreground lg:block">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </Fragment>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const state = getStepState(index, currentStep);
          const isLast = index === steps.length - 1;
          const clickable = state === "completed" && Boolean(onStepClick);

          return (
            <li
              key={step.id ?? step.label}
              className="flex min-w-0 gap-3"
              aria-current={state === "active" ? "step" : undefined}
            >
              <div className="flex flex-col items-center">
                <StepCircle
                  index={index}
                  state={state}
                  label={step.label}
                  clickable={clickable}
                  onClick={
                    clickable ? () => onStepClick?.(index) : undefined
                  }
                />
                {!isLast ? (
                  <Connector
                    orientation="vertical"
                    className="my-1"
                    fillRef={(el) => {
                      connectorFillRefs.current[index] = el;
                    }}
                  />
                ) : null}
              </div>
              <div className="min-w-0 pb-6 pt-1.5">
                <p
                  className={cn(
                    "text-[13px] font-medium",
                    state === "active"
                      ? "text-foreground"
                      : "text-[color:var(--step-label)]",
                  )}
                  style={{
                    ["--step-label" as string]: STEP_PROGRESS_LABEL_COLOR,
                  }}
                >
                  {step.label}
                </p>
                {step.description ? (
                  <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
