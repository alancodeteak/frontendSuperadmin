"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLinkIcon, ImageIcon } from "lucide-react";

import {
  TicketImageCarouselDialog,
  normalizeTicketImages,
} from "@/components/analytics/ticket-images";
import { StatusBadge } from "@/components/shared/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AnalyticsTicket } from "@/types/api";

function formatTicketDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-AE", {
    timeZone: "Asia/Dubai",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 text-sm last:border-b-0 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{value}</dd>
    </div>
  );
}

type TicketDetailDialogProps = {
  ticket: AnalyticsTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: TicketDetailDialogProps) {
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  if (!ticket) return null;

  const images = normalizeTicketImages(ticket);
  const shopId =
    typeof ticket.shop_id === "string" ? ticket.shop_id.trim() : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-5 py-4 pr-12 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg">
                Ticket #{ticket.id}
              </DialogTitle>
              <StatusBadge status={ticket.status} />
            </div>
            <DialogDescription>
              Opened {formatTicketDate(ticket.created_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto px-5 py-4">
            <dl>
              <DetailRow label="User" value={ticket.user_id ?? "—"} />
              <DetailRow label="Role" value={ticket.user_role ?? "—"} />
              <DetailRow
                label="Shop"
                value={
                  shopId ? (
                    <Link
                      href={`/shops/${encodeURIComponent(shopId)}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                      onClick={() => onOpenChange(false)}
                    >
                      {shopId}
                      <ExternalLinkIcon className="size-3.5" />
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow label="Order" value={ticket.order_id ?? "—"} />
              <DetailRow
                label="Reason"
                value={
                  ticket.reason?.trim() ? (
                    <span className="font-normal">{ticket.reason}</span>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Attached images</h3>
                {images.length > 0 ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => {
                      setCarouselIndex(0);
                      setCarouselOpen(true);
                    }}
                  >
                    <ImageIcon className="size-3.5" />
                    View all
                  </button>
                ) : null}
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      aria-label={`View image ${index + 1}`}
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90"
                      onClick={() => {
                        setCarouselIndex(index);
                        setCarouselOpen(true);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt=""
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                  No images attached to this ticket.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TicketImageCarouselDialog
        open={carouselOpen}
        onOpenChange={setCarouselOpen}
        images={images}
        ticketId={ticket.id}
        initialIndex={carouselIndex}
        title={`Ticket #${ticket.id} images`}
      />
    </>
  );
}
