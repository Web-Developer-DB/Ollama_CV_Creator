// Browser-local selected model state. It is intentionally tiny because runtime
// readiness is still verified by the server/service layer before generation.
export const selectedModelStorageKey = "ollama-cv-selected-model";

export const readStoredModel = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(selectedModelStorageKey) ?? undefined;
};

export const storeSelectedModel = (model: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(selectedModelStorageKey, model);
};
