"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlusIcon, Loader2Icon, StoreIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  readShopPhotoFile,
  revokeShopPhotoPreview,
  SHOP_PHOTO_ACCEPT,
  type ShopPhotoSelection,
} from "@/lib/shop-photo";
import { cn } from "@/lib/utils";

type ShopPhotoDropzoneProps = {
  value: ShopPhotoSelection | null;
  onChange: (value: ShopPhotoSelection | null) => void;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  label?: string;
  hint?: string;
};

export function ShopPhotoDropzone({
  value,
  onChange,
  disabled = false,
  error,
  className,
  label = "Shop profile photo",
  hint = "Optional. JPEG, PNG, or WebP up to 5 MB.",
}: ShopPhotoDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = error ?? localError;

  const applyFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled) return;
      setLocalError(null);
      setBusy(true);
      try {
        const next = await readShopPhotoFile(file);
        revokeShopPhotoPreview(value);
        onChange(next);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load image";
        setLocalError(message);
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, onChange, value],
  );

  function handleRemove() {
    if (disabled || busy) return;
    revokeShopPhotoPreview(value);
    onChange(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-xs text-muted-foreground"
            disabled={disabled || busy}
            onClick={handleRemove}
          >
            <Trash2Icon className="size-3.5" />
            Remove
          </Button>
        ) : null}
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload shop profile photo"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled && !busy) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          if (disabled) return;
          void applyFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex min-h-[9.5rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging && !disabled
            ? "border-primary bg-primary/5"
            : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/35",
          disabled && "cursor-not-allowed opacity-60",
          displayError && "border-destructive/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={SHOP_PHOTO_ACCEPT}
          className="sr-only"
          disabled={disabled || busy}
          onChange={(e) => void applyFile(e.target.files?.[0])}
        />

        {value ? (
          <div className="relative size-24 overflow-hidden rounded-full border-4 border-background shadow-md sm:size-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.previewUrl}
              alt="Shop profile preview"
              className="size-full object-cover"
            />
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                <Loader2Icon className="size-7 animate-spin text-white" />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            {busy ? (
              <Loader2Icon className="size-7 animate-spin" />
            ) : (
              <StoreIcon className="size-8" />
            )}
          </div>
        )}

        <div className="max-w-sm space-y-1">
          <p className="text-sm font-medium">
            {value ? "Drop or click to replace" : "Drag and drop a photo here"}
          </p>
          <p className="text-xs text-muted-foreground">
            {value ? value.fileName : hint}
          </p>
        </div>

        {!value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-none"
            tabIndex={-1}
          >
            <ImagePlusIcon className="size-3.5" />
            Browse files
          </Button>
        ) : null}
      </div>

      {displayError ? (
        <p className="mt-2 text-xs text-destructive">{displayError}</p>
      ) : null}
    </div>
  );
}
