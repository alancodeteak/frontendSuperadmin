import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: `How ${siteConfig.name} uses cookies and similar storage.`,
};

const CATEGORIES = [
  {
    title: "Strictly necessary",
    always: true,
    body: "Keeps you signed in and protects the console against request forgery. These are set when you log in and cannot be turned off.",
    examples: [
      "yaadro_access_token — short-lived admin session token",
      "yaadro_refresh_token — renews the session without a new login code",
      "yaadro_cookie_consent — remembers the choice you make on this page",
    ],
  },
  {
    title: "Analytics",
    always: false,
    body: "Aggregated usage and performance data that shows which dashboards, reports and exports are used, so we know where to invest.",
    examples: ["Page and feature usage counters", "Error and latency samples"],
  },
  {
    title: "Preferences",
    always: false,
    body: "Remembers interface choices so the console looks the same next time you open it.",
    examples: [
      "sidebar_state — collapsed or expanded navigation",
      "Table filters, page size and dismissed notifications",
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="text-sm text-muted-foreground">{siteConfig.name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Cookie policy
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        We use cookies and browser storage to keep the admin console secure,
        remember your interface choices, and understand how the product is used.
        You decide which optional categories are allowed, and you can change that
        decision at any time from Settings.
      </p>

      <div className="mt-8 grid gap-4">
        {CATEGORIES.map((category) => (
          <section key={category.title} className="rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{category.title}</h2>
              <span className="text-xs text-muted-foreground">
                {category.always ? "Always on" : "Optional"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {category.body}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {category.examples.map((example) => (
                <li key={example} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Button render={<Link href="/settings" />}>Manage preferences</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Back to dashboard
        </Button>
      </div>
    </main>
  );
}
