import * as XLSX from "xlsx";

export type ExcelCell = string | number | boolean | null;
export type ExcelSheetPreview = {
  name: string;
  rows: ExcelCell[][];
  columnCount: number;
};

export type ExcelWorkbookPreview = {
  filename: string;
  sheets: ExcelSheetPreview[];
};

function columnLabel(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

export function excelColumnLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => columnLabel(i));
}

function normalizeCell(value: unknown): ExcelCell {
  if (value == null || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function parseExcelBlob(
  blob: Blob,
  filename: string,
): Promise<ExcelWorkbookPreview> {
  const buffer = await blob.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheets: ExcelSheetPreview[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null)[]>(
      sheet,
      {
        header: 1,
        defval: null,
        raw: false,
      },
    );

    const rows = matrix.map((row) =>
      (Array.isArray(row) ? row : []).map((cell) => normalizeCell(cell)),
    );
    const columnCount = Math.max(1, ...rows.map((row) => row.length), 1);

    return {
      name,
      rows: rows.map((row) => {
        const padded = [...row];
        while (padded.length < columnCount) padded.push(null);
        return padded;
      }),
      columnCount,
    };
  });

  return { filename, sheets };
}

export function buildWorkbookBlob(
  sheets: Array<{ name: string; rows: ExcelCell[][] }>,
  filename: string,
): { blob: Blob; filename: string } {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(
      sheet.rows.map((row) => row.map((cell) => (cell == null ? "" : cell))),
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return {
    blob: new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  };
}
