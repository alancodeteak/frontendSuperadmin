"use client";

import { toast } from "sonner";

import {
  AppToastContent,
  type AppToastVariant,
} from "@/components/feedback/app-toast";

const DEFAULT_DURATION_MS = 4000;

function showAppToast(message: string, variant: AppToastVariant) {
  return toast.custom(
    (id) => <AppToastContent id={id} message={message} variant={variant} />,
    { duration: DEFAULT_DURATION_MS },
  );
}

export const appToast = {
  success: (message: string) => showAppToast(message, "success"),
  error: (message: string) => showAppToast(message, "error"),
  info: (message: string) => showAppToast(message, "info"),
  dismiss: toast.dismiss,
};
