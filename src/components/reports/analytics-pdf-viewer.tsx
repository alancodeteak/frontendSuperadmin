"use client";

import { useEffect, useRef, useState } from "react";
import {
  ExternalLinkIcon,
  FileDownIcon,
  Loader2Icon,
  MaximizeIcon,
  MinimizeIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnalyticsPdfViewerProps = {
  blob: Blob;
  filename: string;
  onClose?: () => void;
  className?: string;
};

function toPdfObjectUrl(blob: Blob) {
  const pdfBlob =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  return URL.createObjectURL(pdfBlob);
}

export function AnalyticsPdfViewer({
  blob,
  filename,
  onClose,
  className,
}: AnalyticsPdfViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const urlRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadError(false);
    const objectUrl = toPdfObjectUrl(blob);
    urlRef.current = objectUrl;
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      urlRef.current = null;
    };
  }, [blob]);

  useEffect(() => {
    if (!expanded) {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [blob, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  function onDownload() {
    if (!urlRef.current) return;
    const a = document.createElement("a");
    a.href = urlRef.current;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function onOpenTab() {
    if (!urlRef.current) return;
    window.open(urlRef.current, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      {expanded ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
          aria-hidden
          onClick={() => setExpanded(false)}
        />
      ) : null}

      <div
        ref={rootRef}
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
          expanded &&
            "fixed inset-3 z-50 shadow-2xl sm:inset-5",
          className,
        )}
        style={
          expanded
            ? undefined
            : {
                height: "calc(100dvh - 7rem)",
                minHeight: 820,
              }
        }
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
              PDF
            </span>
            <span className="truncate text-sm font-medium">{filename}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Open in new tab"
              onClick={onOpenTab}
            >
              <ExternalLinkIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Download PDF"
              onClick={onDownload}
            >
              <FileDownIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title={expanded ? "Exit full preview" : "Full preview"}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <MinimizeIcon className="size-3.5" />
              ) : (
                <MaximizeIcon className="size-3.5" />
              )}
            </Button>
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Close preview"
                onClick={onClose}
              >
                <XIcon className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div
          className="relative flex-1 bg-neutral-200 dark:bg-neutral-900"
          style={{ minHeight: expanded ? undefined : 760 }}
        >
          {url && !loadError ? (
            <object
              data={url}
              type="application/pdf"
              className="absolute inset-0 size-full"
              aria-label={`PDF preview: ${filename}`}
            >
              <iframe
                src={url}
                className="absolute inset-0 size-full border-0 bg-white"
                title={`PDF preview: ${filename}`}
                onError={() => setLoadError(true)}
              />
            </object>
          ) : null}

          {!url ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {loadError && url ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                This browser blocked the embedded PDF preview.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={onOpenTab}>
                  <ExternalLinkIcon className="size-3.5" />
                  Open PDF
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onDownload}
                >
                  <FileDownIcon className="size-3.5" />
                  Download
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
