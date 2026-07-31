"use client";

import Image from "next/image";
import { Loader2Icon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SUCCESS_TOAST_ANIMATION,
  SUCCESS_TOAST_ANIMATION_CONTENT,
  SUCCESS_TOAST_ANIMATION_FRAME,
} from "@/constants/toast";
import { cn } from "@/lib/utils";

export type ShopConfirmPhase =
  | "confirm"
  | "loading"
  | "success"
  | "error";

type ShopConfirmDialogProps = {
  open: boolean;
  phase: ShopConfirmPhase;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive" | "outline";
  icon?: LucideIcon;
  iconClassName?: string;
  shopName?: string | null;
  shopId?: string | null;
  loadingTitle?: string;
  loadingDescription?: string;
  successTitle?: string;
  successDescription?: string;
  successActionLabel?: string;
  errorTitle?: string;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSuccessAction?: () => void;
  onRetry?: () => void;
};

function SuccessAnimation() {
  const scale = 56 / SUCCESS_TOAST_ANIMATION_CONTENT.width;

  return (
    <div className="relative mx-auto size-14 overflow-hidden" aria-hidden>
      <Image
        src={SUCCESS_TOAST_ANIMATION}
        alt=""
        width={SUCCESS_TOAST_ANIMATION_FRAME.width * scale}
        height={SUCCESS_TOAST_ANIMATION_FRAME.height * scale}
        className="absolute max-w-none"
        style={{
          left: -SUCCESS_TOAST_ANIMATION_CONTENT.x * scale,
          top: -SUCCESS_TOAST_ANIMATION_CONTENT.y * scale,
        }}
        unoptimized
      />
    </div>
  );
}

export function ShopConfirmDialog({
  open,
  phase,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  icon: Icon,
  iconClassName,
  shopName,
  shopId,
  loadingTitle = "Working…",
  loadingDescription = "Please wait a moment.",
  successTitle = "Done",
  successDescription,
  successActionLabel = "Continue",
  errorTitle = "Something went wrong",
  errorMessage,
  onOpenChange,
  onConfirm,
  onSuccessAction,
  onRetry,
}: ShopConfirmDialogProps) {
  const isBusy = phase === "loading" || phase === "success";
  const canDismiss = phase === "confirm" || phase === "error";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isBusy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={canDismiss}
        className="gap-0 overflow-hidden border bg-card p-0 shadow-xl sm:max-w-md"
      >
        {phase === "confirm" ? (
          <>
            <div className="p-6 pb-5">
              <DialogHeader className="gap-3 text-left">
                {Icon ? (
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-2xl bg-muted text-foreground",
                      iconClassName,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                ) : null}
                <DialogTitle className="text-lg font-semibold">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {description}
                </DialogDescription>
              </DialogHeader>
              {shopName || shopId ? (
                <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm">
                  {shopName ? (
                    <p className="font-medium">{shopName}</p>
                  ) : null}
                  {shopId ? (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {shopId}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant={confirmVariant} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === "loading" ? (
          <div className="p-8 text-center">
            <Loader2Icon className="mx-auto size-10 animate-spin text-primary" />
            <p className="mt-5 text-base font-semibold">{loadingTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingDescription}
            </p>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="p-8 text-center">
            <SuccessAnimation />
            <p className="mt-5 text-base font-semibold">{successTitle}</p>
            {successDescription ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {successDescription}
              </p>
            ) : null}
            {onSuccessAction ? (
              <Button className="mt-6 w-full" onClick={onSuccessAction}>
                {successActionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}

        {phase === "error" ? (
          <>
            <div className="p-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-semibold text-destructive">
                  {errorTitle}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {errorMessage || "Please try again."}
                </DialogDescription>
              </DialogHeader>
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
