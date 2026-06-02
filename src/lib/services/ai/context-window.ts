// Context-window sizing for Ollama requests. It estimates mixed German/English
// text roughly and rounds up to stable Ollama-friendly presets.
import type { AiRuntimeOptions } from "@/types/api";

const contextWindowSteps = [4096, 8192, 16384, 32768] as const;
const approximateCharactersPerToken = 3.5;

type ResolveContextWindowOptions = {
  texts: string[];
  runtime?: AiRuntimeOptions;
  minimum: number;
  expectedOutputTokens: number;
  overheadTokens?: number;
};

const estimateTokens = (text: string): number =>
  Math.ceil(text.length / approximateCharactersPerToken);

const roundUpContextWindow = (tokens: number): number =>
  contextWindowSteps.find((step) => step >= tokens) ??
  contextWindowSteps[contextWindowSteps.length - 1];

export const estimateRequiredContextWindow = ({
  texts,
  minimum,
  expectedOutputTokens,
  overheadTokens = 1024
}: Omit<ResolveContextWindowOptions, "runtime">): number => {
  const inputTokens = texts.reduce((total, text) => total + estimateTokens(text), 0);
  const requiredTokens = inputTokens + expectedOutputTokens + overheadTokens;

  return roundUpContextWindow(Math.max(minimum, requiredTokens));
};

export const resolveContextWindow = ({
  texts,
  runtime,
  minimum,
  expectedOutputTokens,
  overheadTokens
}: ResolveContextWindowOptions): number =>
  Math.max(
    runtime?.contextWindow ?? minimum,
    estimateRequiredContextWindow({
      texts,
      minimum,
      expectedOutputTokens,
      overheadTokens
    })
  );
