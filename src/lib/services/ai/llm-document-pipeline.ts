import { z } from "zod";
import { createErrorResponse } from "@/lib/services/api-response";
import type { ApiResponse } from "@/types/api";

type ParseLlmDocumentOutputOptions<T> = {
  value: unknown;
  schema: z.ZodType<T>;
  normalize: (value: unknown) => T | undefined;
  schemaErrorMessage: string;
};

type ParsedLlmDocument<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: ApiResponse<T>;
    };

export const parseLlmDocumentOutput = <T>({
  value,
  schema,
  normalize,
  schemaErrorMessage
}: ParseLlmDocumentOutputOptions<T>): ParsedLlmDocument<T> => {
  const directParsed = schema.safeParse(value);
  if (directParsed.success) {
    return {
      success: true,
      data: directParsed.data
    };
  }

  const normalizedValue = normalize(value);
  const normalizedParsed = schema.safeParse(normalizedValue);
  if (normalizedParsed.success) {
    return {
      success: true,
      data: normalizedParsed.data
    };
  }

  return {
    success: false,
    response: createErrorResponse(
      "SCHEMA_VALIDATION_FAILED",
      schemaErrorMessage
    )
  };
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readString = (value: unknown): string | undefined =>
  typeof value === "string"
    ? value.trim() || undefined
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : undefined;

export const readRecordValue = (
  value: Record<string, unknown>,
  keys: string[]
): unknown => keys.map((key) => value[key]).find((item) => item !== undefined);

export const splitListText = (value: string): string[] =>
  value
    .split(/\n|•/)
    .map((item) => item.trim())
    .filter(Boolean);

export const splitParagraphText = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const readStringArray = (
  value: unknown,
  splitText: (value: string) => string[] = splitListText
): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [item];
        }

        if (isRecord(item)) {
          return [
            readString(
              readRecordValue(item, [
                "text",
                "content",
                "body",
                "paragraph",
                "description",
                "title",
                "name"
              ])
            )
          ];
        }

        return [];
      })
      .filter((item): item is string => Boolean(item));
  }

  const text = readString(value);

  return text ? splitText(text) : [];
};

export const normalizeGeneratedId = (prefix: string, value: unknown): string =>
  readString(value) ?? prefix;

export const readDateRange = (
  value: Record<string, unknown>
): string | undefined => {
  const explicitDateRange = readString(
    readRecordValue(value, ["dateRange", "date_range", "period"])
  );

  if (explicitDateRange) {
    return explicitDateRange;
  }

  const startDate = readString(readRecordValue(value, ["startDate", "start"]));
  const endDate = readString(readRecordValue(value, ["endDate", "end"]));

  return [startDate, endDate].filter(Boolean).join(" - ") || undefined;
};
