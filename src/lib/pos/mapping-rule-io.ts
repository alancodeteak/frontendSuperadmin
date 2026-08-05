/** Shared read/write helpers for MappingEngine rule objects. */

export type MappingRuleRecord = Record<string, unknown>;

export function isMappingRuleRecord(value: unknown): value is MappingRuleRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readRulePaths(rule: unknown): string {
  if (!isMappingRuleRecord(rule) || !Array.isArray(rule.paths)) return "";
  return rule.paths.map(String).join(", ");
}

export function readRuleConcat(rule: unknown): string {
  if (!isMappingRuleRecord(rule) || !Array.isArray(rule.concat)) return "";
  return rule.concat.map(String).join(", ");
}

export function readRuleSeparator(rule: unknown): string {
  if (!isMappingRuleRecord(rule) || typeof rule.separator !== "string") return ", ";
  return rule.separator;
}

export function readRuleValueMapRef(rule: unknown): string {
  if (!isMappingRuleRecord(rule) || typeof rule.value_map_ref !== "string") return "";
  return rule.value_map_ref;
}

export function parsePathList(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseRuleDefault(raw: string): unknown {
  const value = raw.trim();
  if (!value) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && value !== "" ? numberValue : value;
}

/** Update paths or concat while preserving default/optional/value_map_ref/separator. */
export function patchRuleSource(
  rule: MappingRuleRecord,
  mode: "path" | "join",
  raw: string,
): MappingRuleRecord {
  const next: MappingRuleRecord = { ...rule };
  if (mode === "join") {
    delete next.paths;
    const concat = parsePathList(raw);
    if (concat.length === 0) delete next.concat;
    else next.concat = concat;
    if (Array.isArray(next.concat) && next.concat.length > 0 && next.separator === undefined) {
      next.separator = ", ";
    }
  } else {
    delete next.concat;
    const paths = parsePathList(raw);
    if (paths.length === 0) delete next.paths;
    else next.paths = paths;
  }
  return next;
}

export function switchRuleMode(
  rule: MappingRuleRecord,
  mode: "path" | "join",
  currentSource: string,
): MappingRuleRecord {
  const next: MappingRuleRecord = { ...rule };
  delete next.paths;
  delete next.concat;
  if (mode === "join") {
    const concat = currentSource ? parsePathList(currentSource) : [];
    if (concat.length === 0) delete next.concat;
    else {
      next.concat = concat;
      if (next.separator === undefined) next.separator = ", ";
    }
  } else {
    const paths = currentSource ? parsePathList(currentSource) : [];
    if (paths.length === 0) delete next.paths;
    else next.paths = paths;
  }
  return next;
}

export function writeRulePaths(pathsCsv: string): MappingRuleRecord {
  const paths = parsePathList(pathsCsv);
  return paths.length ? { paths } : {};
}

export function writeRuleConcat(fieldsCsv: string, separator = ", "): MappingRuleRecord {
  const concat = parsePathList(fieldsCsv);
  return concat.length ? { concat, separator } : {};
}
