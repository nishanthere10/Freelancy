/**
 * Deterministic Condition Evaluator for Automation Engine and Dry-Run Testing
 */

export interface ConditionRule {
  field: string;
  operator: string;
  value?: any;
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: ConditionRule[];
}

export function extractFieldValue(field: string, payload: Record<string, any>): any {
  if (!payload || typeof payload !== "object") return undefined;

  let val: any = payload;
  if (field.includes(".")) {
    const parts = field.split(".");
    for (const part of parts) {
      if (val && typeof val === "object") {
        val = val[part];
      } else {
        val = undefined;
        break;
      }
    }
  } else {
    val = payload[field];
  }

  // Fallback checks inside nested data or context
  if (val === undefined && payload.data && typeof payload.data === "object") {
    val = payload.data[field] ?? (field.includes(".") ? payload.data[field.split(".").pop()!] : undefined);
  }
  if (val === undefined && payload.context && typeof payload.context === "object") {
    val = payload.context[field] ?? (field.includes(".") ? payload.context[field.split(".").pop()!] : undefined);
  }

  return val;
}

export function evaluateCondition(cond: ConditionRule, payload: Record<string, any>): boolean {
  const actualValue = extractFieldValue(cond.field, payload);
  const expected = cond.value;

  switch (cond.operator) {
    case "eq":
      // Loose equality to support string-number comparisons from payloads
      return String(actualValue) === String(expected);
    case "neq":
      return String(actualValue) !== String(expected);
    case "contains":
      return typeof actualValue === "string" && typeof expected === "string" && actualValue.toLowerCase().includes(expected.toLowerCase());
    case "gt":
      return Number(actualValue) > Number(expected);
    case "gte":
      return Number(actualValue) >= Number(expected);
    case "lt":
      return Number(actualValue) < Number(expected);
    case "lte":
      return Number(actualValue) <= Number(expected);
    case "exists":
      return actualValue !== undefined && actualValue !== null && actualValue !== "";
    default:
      return false;
  }
}

export interface EvaluationReport {
  matched: boolean;
  results: Array<{
    field: string;
    operator: string;
    expected: any;
    actual: any;
    pass: boolean;
  }>;
}

export function evaluateConditionGroup(
  group?: ConditionGroup,
  payload: Record<string, any> = {},
): EvaluationReport {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return { matched: true, results: [] };
  }

  const results = group.conditions.map((cond) => {
    const actual = extractFieldValue(cond.field, payload);
    const pass = evaluateCondition(cond, payload);
    return {
      field: cond.field,
      operator: cond.operator,
      expected: cond.value,
      actual,
      pass,
    };
  });

  const matched =
    group.operator === "OR"
      ? results.some((r) => r.pass)
      : results.every((r) => r.pass);

  return { matched, results };
}
