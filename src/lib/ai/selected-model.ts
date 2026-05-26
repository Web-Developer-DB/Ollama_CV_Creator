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
