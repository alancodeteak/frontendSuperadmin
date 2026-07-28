"use client";

import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

import {
  SUCCESS_TOAST_ANIMATION,
  SUCCESS_TOAST_ANIMATION_CONTENT,
  SUCCESS_TOAST_ANIMATION_FRAME,
  SUCCESS_TOAST_ICON_SIZE,
} from "@/constants/toast";
import { cn } from "@/lib/utils";

export type AppToastVariant = "success" | "error" | "info";

const variantStyles: Record<AppToastVariant, string> = {
  success: "border-border/60 bg-white text-foreground border",
  error: "bg-[#dc2626] text-white",
  info: "border-border/60 bg-muted text-foreground border",
};

interface AppToastContentProps {
  id: string | number;
  message: string;
  variant: AppToastVariant;
  /** Disable slide animation (playground static preview) */
  preview?: boolean;
}

function SuccessToastIcon() {
  const scale = SUCCESS_TOAST_ICON_SIZE / SUCCESS_TOAST_ANIMATION_CONTENT.width;

  return (
    <span
      className="relative shrink-0 overflow-hidden"
      style={{
        width: SUCCESS_TOAST_ICON_SIZE,
        height: SUCCESS_TOAST_ICON_SIZE,
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SUCCESS_TOAST_ANIMATION}
        alt=""
        className="absolute max-w-none"
        style={{
          width: SUCCESS_TOAST_ANIMATION_FRAME.width * scale,
          height: SUCCESS_TOAST_ANIMATION_FRAME.height * scale,
          left: -SUCCESS_TOAST_ANIMATION_CONTENT.x * scale,
          top: -SUCCESS_TOAST_ANIMATION_CONTENT.y * scale,
        }}
      />
    </span>
  );
}

function ToastIcon({ variant }: { variant: AppToastVariant }) {
  if (variant === "success") {
    return <SuccessToastIcon />;
  }

  if (variant === "info") {
    return (
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background"
        aria-hidden
      >
        <span className="size-2 rounded-full bg-primary" />
      </span>
    );
  }

  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-white"
      aria-hidden
    >
      <AlertCircle className="size-3 stroke-[2.5]" />
    </span>
  );
}

export function AppToastContent({
  id,
  message,
  variant,
  preview = false,
}: AppToastContentProps) {
  const className = cn(
    "pointer-events-auto mx-auto flex w-full max-w-[22rem] items-center gap-3 rounded-full py-3 pr-3 pl-4 shadow-lg",
    variantStyles[variant],
  );

  const content = (
    <>
      <ToastIcon variant={variant} />
      <p className="min-w-0 flex-1 text-sm leading-snug font-medium">{message}</p>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-60",
          variant === "error" ? "text-white" : "text-muted-foreground",
        )}
      >
        <X className="size-4 stroke-[2.5]" aria-hidden />
      </button>
    </>
  );

  if (preview) {
    return (
      <div role="status" className={className}>
        {content}
      </div>
    );
  }

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 48, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className={className}
    >
      {content}
    </motion.div>
  );
}
