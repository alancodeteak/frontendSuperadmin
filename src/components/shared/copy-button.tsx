"use client";

import { useEffect, useState } from "react";

import { Clipboard } from "@/components/animate-ui/icons/clipboard";
import { Copy } from "@/components/animate-ui/icons/copy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  value: string;
  className?: string;
  size?: number;
  label?: string;
  copiedLabel?: string;
  disabled?: boolean;
  iconOnly?: boolean;
};

export function CopyButton({
  value,
  className,
  size = 16,
  label = "Copy",
  copiedLabel = "Copied",
  disabled,
  iconOnly = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    if (!value || disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || !value}
      onClick={() => void handleCopy()}
      className={cn("gap-1.5", className)}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
    >
      {copied ? (
        <Clipboard size={size} animate />
      ) : (
        <Copy size={size} animateOnHover />
      )}
      <span className={iconOnly ? "sr-only" : "sr-only sm:not-sr-only"}>
        {copied ? copiedLabel : label}
      </span>
    </Button>
  );
}
