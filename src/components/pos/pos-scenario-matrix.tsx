"use client";

import { Badge } from "@/components/ui/badge";
import {
  POS_SCENARIO_MATRIX,
  type PosPlaybookSeverity,
} from "@/lib/pos/playbook-copy";

function severityBadge(severity: PosPlaybookSeverity) {
  if (severity === "config_only") {
    return (
      <Badge variant="secondary" className="font-normal">
        config only
      </Badge>
    );
  }
  if (severity === "partial") {
    return (
      <Badge variant="outline" className="font-normal">
        partial
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="font-normal">
      needs code
    </Badge>
  );
}

export function PosScenarioMatrix({ className }: { className?: string }) {
  return (
    <div
      className={
        className ??
        "overflow-x-auto rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
      }
    >
      <p className="mb-3 text-muted-foreground">
        If a row is marked needs code, do not create a fake generic template —
        request a connector.
      </p>
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Scenario</th>
            <th className="py-2 pr-3 font-medium">Config-only</th>
            <th className="py-2 pr-3 font-medium">Needs code</th>
            <th className="py-2 font-medium">Badge</th>
          </tr>
        </thead>
        <tbody>
          {POS_SCENARIO_MATRIX.map((row) => (
            <tr key={row.scenario} className="border-b border-border/60 align-top">
              <td className="py-2 pr-3">{row.scenario}</td>
              <td className="py-2 pr-3 text-muted-foreground">{row.configOnly}</td>
              <td className="py-2 pr-3 text-muted-foreground">{row.needsCode}</td>
              <td className="py-2">{severityBadge(row.severity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
