"use client";

import Image from "next/image";
import { CheckCircle2Icon, Loader2Icon, StoreIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SUCCESS_TOAST_ANIMATION,
  SUCCESS_TOAST_ANIMATION_CONTENT,
  SUCCESS_TOAST_ANIMATION_FRAME,
} from "@/constants/toast";

export type CreateShopFlowPhase =
  | "confirm"
  | "creating"
  | "slow"
  | "success"
  | "error";

type CreateShopFlowDialogProps = {
  open: boolean;
  phase: CreateShopFlowPhase;
  shopName: string;
  shopId: string;
  errorMessage?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onRunInBackground: () => void;
  onViewShop: () => void;
  onRetry?: () => void;
};

function SuccessAnimation() {
  const scale = 56 / SUCCESS_TOAST_ANIMATION_CONTENT.width;

  return (
    <div
      className="relative mx-auto size-14 overflow-hidden"
      aria-hidden
    >
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

export function CreateShopFlowDialog({
  open,
  phase,
  shopName,
  shopId,
  errorMessage,
  onOpenChange,
  onConfirm,
  onRunInBackground,
  onViewShop,
  onRetry,
}: CreateShopFlowDialogProps) {
  const isBusy = phase === "creating" || phase === "slow";
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
        className={cn(
          "gap-0 overflow-hidden border bg-card p-0 shadow-xl sm:max-w-md",
          phase === "confirm" && "sm:max-w-lg",
        )}
      >
        {phase === "confirm" ? (
          <>
            <div className="p-6 pb-5">
              <DialogHeader className="gap-3 text-left">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <StoreIcon className="size-5" />
                </div>
                <DialogTitle className="text-lg font-semibold">
                  Create this shop?
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  You are about to provision{" "}
                  <span className="font-medium text-foreground">
                    {shopName || "this shop"}
                  </span>{" "}
                  with login ID and password. Make sure the password is copied
                  before you continue.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="font-medium">{shopName || "Untitled shop"}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {shopId || "—"}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Go back
              </Button>
              <Button onClick={onConfirm}>Yes, create shop</Button>
            </DialogFooter>
          </>
        ) : null}

        {phase === "creating" || phase === "slow" ? (
          <div className="p-8 text-center">
            <Loader2Icon className="mx-auto size-10 animate-spin text-primary" />
            <p className="mt-5 text-base font-semibold">Creating shop…</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Setting up the shop account, features, delivery, and ecom settings.
            </p>
            {phase === "slow" ? (
              <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-4 text-left">
                <p className="text-sm font-medium">Taking longer than usual</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  You can keep waiting here or continue in the background. We
                  will notify you when the shop is ready.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={onRunInBackground}
                >
                  Continue in background
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="p-8 text-center">
            <SuccessAnimation />
            <p className="mt-5 text-base font-semibold">Shop created</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {shopName || "Your shop"}
              </span>{" "}
              is ready to use.
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {shopId}
            </p>
            <Button className="mt-6 w-full" onClick={onViewShop}>
              <CheckCircle2Icon className="size-4" />
              View shop
            </Button>
          </div>
        ) : null}

        {phase === "error" ? (
          <>
            <div className="p-6">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-semibold text-destructive">
                  Could not create shop
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  {errorMessage ||
                    "Something went wrong while creating the shop. Please review the form and try again."}
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
