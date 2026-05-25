"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import type { ApiResponse } from "@/types/api";

type OllamaModelStatus = {
  name: string;
  size?: number;
  digest?: string;
  modifiedAt?: string;
  parameterSize?: string;
  quantizationLevel?: string;
};

type OllamaStatus = {
  baseUrl: string;
  configuredModel: string;
  reachable: boolean;
  selectedModelAvailable: boolean;
  checkedAt: string;
  models: OllamaModelStatus[];
  error?: string;
};

const selectedModelStorageKey = "ollama-cv-selected-model";

const readStoredModel = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage.getItem(selectedModelStorageKey) ?? undefined;
};

const storeSelectedModel = (model: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(selectedModelStorageKey, model);
};

const formatSize = (size: number | undefined): string =>
  size === undefined ? "Unknown" : `${(size / 1_000_000_000).toFixed(1)} GB`;

const formatDate = (value: string | undefined): string => {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
};

const pickSelectedModel = (status: OllamaStatus): string => {
  const storedModel = readStoredModel();
  const modelNames = new Set(status.models.map((model) => model.name));

  if (storedModel && modelNames.has(storedModel)) {
    return storedModel;
  }

  if (modelNames.has(status.configuredModel)) {
    return status.configuredModel;
  }

  return status.models[0]?.name ?? status.configuredModel;
};

export function AiSettingsScreen() {
  const [status, setStatus] = useState<OllamaStatus>();
  const [selectedModel, setSelectedModel] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [requestError, setRequestError] = useState<string>();

  const refreshStatus = useCallback(async () => {
    setIsChecking(true);
    setRequestError(undefined);

    try {
      const response = await fetch("/api/ai/status");
      const payload = (await response.json()) as ApiResponse<OllamaStatus>;

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Status check failed");
      }

      const nextSelectedModel = pickSelectedModel(payload.data);

      setStatus(payload.data);
      setSelectedModel(nextSelectedModel);
      setIsConnected(payload.data.reachable);
    } catch (error) {
      setStatus(undefined);
      setIsConnected(false);
      setRequestError(
        error instanceof Error ? error.message : "Status check failed"
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const selectedModelDetails = useMemo(
    () => status?.models.find((model) => model.name === selectedModel),
    [selectedModel, status?.models]
  );
  const modelIsReady = isConnected && Boolean(selectedModelDetails);
  const connectionStatus = !isConnected
    ? "Disconnected"
    : modelIsReady
      ? "Connected"
      : "No model loaded";
  const connectionStatusClassName = modelIsReady
    ? "text-emerald-700"
    : isConnected
      ? "text-amber-700"
      : "text-slate-950";
  const modelStatus = modelIsReady ? "Ready" : "Not ready";

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    storeSelectedModel(model);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "AI status" },
        { label: "Ollama", value: isConnected ? "Reachable" : "Offline" },
        { label: "Models", value: String(status?.models.length ?? 0) }
      ]}
      title="AI Status"
    >
      <div className="grid gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Connection</p>
              <p
                className={`mt-2 text-2xl font-semibold ${connectionStatusClassName}`}
              >
                {connectionStatus}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {status?.baseUrl ?? "http://127.0.0.1:11434"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isChecking}
                onClick={refreshStatus}
                type="button"
              >
                {isChecking ? "Checking" : "Connect"}
              </button>
              <button
                className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={!isConnected}
                onClick={handleDisconnect}
                type="button"
              >
                Disconnect
              </button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-slate-500">Model</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {modelIsReady ? "Available" : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Installed models
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {status?.models.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Last check
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {formatDate(status?.checkedAt)}
              </dd>
            </div>
          </dl>

          {status?.error ? (
            <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              {status.error}
            </p>
          ) : null}
          {requestError ? (
            <p className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
              {requestError}
            </p>
          ) : null}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Model
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-action disabled:cursor-not-allowed disabled:bg-slate-100"
                disabled={!isConnected || (status?.models.length ?? 0) === 0}
                onChange={(event) => handleSelectModel(event.target.value)}
                value={selectedModel}
              >
                {status?.models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Selection state
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                {selectedModel &&
                status &&
                selectedModel !== status.configuredModel
                  ? "Selected locally"
                  : "Server default"}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Status</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {modelStatus}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Size</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {formatSize(selectedModelDetails?.size)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Parameters</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {selectedModelDetails?.parameterSize ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">
                Quantization
              </dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">
                {selectedModelDetails?.quantizationLevel ?? "Unknown"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
