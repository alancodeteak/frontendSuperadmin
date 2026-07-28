"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ImageIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AnalyticsTicket } from "@/types/api";

export function normalizeTicketImages(ticket: AnalyticsTicket): string[] {
  const raw = ticket.images;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const url =
          record.url ??
          record.image_url ??
          record.imageUrl ??
          record.signed_url ??
          record.signedUrl;
        return typeof url === "string" && url.trim() ? url.trim() : null;
      }
      return null;
    })
    .filter((url): url is string => Boolean(url));
}

type TicketImageCarouselDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  ticketId?: string | number;
  title?: string;
  initialIndex?: number;
};

export function TicketImageCarouselDialog({
  open,
  onOpenChange,
  images,
  ticketId,
  title,
  initialIndex = 0,
}: TicketImageCarouselDialogProps) {
  const [index, setIndex] = useState(initialIndex);
  const count = images.length;
  const current = images[index];

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)));
  }, [open, initialIndex, count]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!open || count <= 1) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, count, goPrev, goNext]);

  if (!count) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="border-b px-4 py-3 pr-12">
          <DialogTitle>
            {title ?? `Ticket #${ticketId ?? "—"} images`}
          </DialogTitle>
          <DialogDescription>
            {count} image{count === 1 ? "" : "s"} attached to this ticket
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-[min(70vh,520px)] items-center justify-center bg-muted/40">
          {count > 1 ? (
            <button
              type="button"
              aria-label="Previous image"
              className="absolute top-1/2 left-3 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 shadow-sm transition-colors hover:bg-background"
              onClick={goPrev}
            >
              <ChevronLeftIcon className="size-4" />
            </button>
          ) : null}

          <div className="relative flex h-[min(70vh,520px)] w-full items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current}
              src={current}
              alt={`Ticket ${ticketId ?? ""} image ${index + 1} of ${count}`}
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
            />
          </div>

          {count > 1 ? (
            <button
              type="button"
              aria-label="Next image"
              className="absolute top-1/2 right-3 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 shadow-sm transition-colors hover:bg-background"
              onClick={goNext}
            >
              <ChevronRightIcon className="size-4" />
            </button>
          ) : null}
        </div>

        {count > 1 ? (
          <div className="border-t bg-background px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Image {index + 1} of {count}
              </span>
              <span>Use arrow keys to navigate</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {images.map((src, thumbIndex) => {
                const active = thumbIndex === index;
                return (
                  <button
                    key={`${src}-${thumbIndex}`}
                    type="button"
                    aria-label={`View image ${thumbIndex + 1}`}
                    aria-current={active}
                    className={cn(
                      "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                      active
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent opacity-70 hover:opacity-100",
                    )}
                    onClick={() => setIndex(thumbIndex)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="size-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function TicketImagesCell({ ticket }: { ticket: AnalyticsTicket }) {
  const images = normalizeTicketImages(ticket);
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (!images.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = images.slice(0, 3);
  const extra = images.length - visible.length;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <div className="flex -space-x-2">
          {visible.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              aria-label={`View ticket image ${i + 1}`}
              className="relative size-9 overflow-hidden rounded-md border-2 border-background bg-muted shadow-sm transition-transform hover:z-10 hover:scale-105"
              onClick={() => {
                setStartIndex(i);
                setOpen(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
        {extra > 0 ? (
          <button
            type="button"
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            onClick={() => {
              setStartIndex(0);
              setOpen(true);
            }}
          >
            +{extra}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={() => {
              setStartIndex(0);
              setOpen(true);
            }}
          >
            <ImageIcon className="size-3" />
            View
          </button>
        )}
      </div>

      <TicketImageCarouselDialog
        open={open}
        onOpenChange={setOpen}
        images={images}
        ticketId={ticket.id}
        initialIndex={startIndex}
      />
    </>
  );
}
