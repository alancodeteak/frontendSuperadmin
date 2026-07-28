"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type AuthPageProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  /** When set, shows a back control in the form panel (e.g. return to email). */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
};

export function AuthPage({
  title,
  description,
  children,
  onBack,
  backLabel = "Back",
  className,
}: AuthPageProps) {
  return (
    <main
      className={cn(
        "relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2",
        className,
      )}
    >
      <div className="relative hidden h-full flex-col border-r bg-muted/60 p-10 lg:flex">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background to-transparent" />
        <BrandMark className="z-10" />
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;One console for every shop, rider and invoice — without
              hopping between tools.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold">
              ~ Yaadro Superadmin
            </footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      <div className="relative flex min-h-screen flex-col justify-center p-4">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 isolate contain-strict opacity-60"
        >
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>

        {onBack ? (
          <Button
            variant="ghost"
            className="absolute top-7 left-5"
            onClick={onBack}
          >
            <ChevronLeftIcon className="me-2 size-4" />
            {backLabel}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="absolute top-7 left-5"
            render={<Link href="/" />}
          >
            <ChevronLeftIcon className="me-2 size-4" />
            Home
          </Button>
        )}

        <div className="mx-auto w-full max-w-sm space-y-4">
          <BrandMark className="lg:hidden" />
          <div className="flex flex-col space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-wide">
              {title}
            </h1>
            <p className="text-base text-muted-foreground">{description}</p>
          </div>
          {children}
          <p className="mt-8 text-sm text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link
              href="/cookies"
              className="underline underline-offset-4 hover:text-primary"
            >
              Cookie Policy
            </Link>{" "}
            and the terms of use for {siteConfig.name}.
          </p>
        </div>
      </div>
    </main>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/yaadro-icon.svg"
        width={36}
        height={44}
        alt=""
        className="h-8 w-auto"
        priority
      />
      <Image
        src="/images/yaadro-text.svg"
        width={120}
        height={28}
        alt={siteConfig.name}
        className="h-5 w-auto"
        priority
      />
    </div>
  );
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-slate-950 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + path.id * 0.25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
