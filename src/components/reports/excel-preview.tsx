"use client";

import { useMemo, useState } from "react";

import {
  excelColumnLabels,
  type ExcelWorkbookPreview,
} from "@/lib/excel";
import { cn } from "@/lib/utils";

type ExcelPreviewProps = {
  workbook: ExcelWorkbookPreview;
  className?: string;
};

export function ExcelPreview({ workbook, className }: ExcelPreviewProps) {
  const [activeSheet, setActiveSheet] = useState(0);
  const sheet =
    workbook.sheets[Math.min(activeSheet, workbook.sheets.length - 1)] ??
    workbook.sheets[0];

  const columns = useMemo(
    () => excelColumnLabels(sheet?.columnCount ?? 1),
    [sheet?.columnCount],
  );

  if (!sheet) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No spreadsheet data to preview.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-[#f3f3f3] shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-[#217346] px-3 py-2 text-white">
        <div className="flex size-7 items-center justify-center rounded bg-white/15 text-xs font-bold">
          X
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{workbook.filename}</p>
          <p className="text-[11px] text-white/80">
            Excel preview · {sheet.rows.length} row
            {sheet.rows.length === 1 ? "" : "s"} · {sheet.columnCount} column
            {sheet.columnCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="border-b border-[#d0d0d0] bg-[#e7e6e6] px-2 py-1.5 text-[11px] text-[#595959]">
        Read-only preview of the export file before download
      </div>

      <div className="max-h-[32rem] overflow-auto bg-white">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 w-10 border border-[#d4d4d4] bg-[#eee] px-1 py-1 text-center font-medium text-[#666]" />
              {columns.map((label) => (
                <th
                  key={label}
                  className="min-w-[7.5rem] border border-[#d4d4d4] bg-[#eee] px-2 py-1 text-center font-medium text-[#666]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="border border-[#d4d4d4] px-3 py-8 text-center text-muted-foreground"
                >
                  Sheet is empty
                </td>
              </tr>
            ) : (
              sheet.rows.map((row, rowIndex) => {
                const isHeader = rowIndex === 0;
                return (
                  <tr key={rowIndex} className={isHeader ? "bg-[#eaf3de]" : undefined}>
                    <th className="sticky left-0 z-10 w-10 border border-[#d4d4d4] bg-[#eee] px-1 py-1 text-center font-medium text-[#666]">
                      {rowIndex + 1}
                    </th>
                    {row.map((cell, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className={cn(
                          "border border-[#d4d4d4] px-2 py-1 align-top whitespace-nowrap text-[#222]",
                          isHeader && "font-semibold text-[#1f4e1f]",
                          typeof cell === "number" && "text-right tabular-nums",
                        )}
                      >
                        {cell == null ? "" : String(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-end gap-0.5 overflow-x-auto border-t border-[#d0d0d0] bg-[#f3f3f3] px-2 pt-1">
        {workbook.sheets.map((item, index) => {
          const selected = index === activeSheet;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => setActiveSheet(index)}
              className={cn(
                "rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors",
                selected
                  ? "relative z-10 -mb-px border-[#d0d0d0] bg-white font-medium text-[#217346]"
                  : "border-transparent bg-[#e7e6e6] text-[#595959] hover:bg-[#dedede]",
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
