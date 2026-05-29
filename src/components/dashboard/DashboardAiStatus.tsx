"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAiStatus } from "@/lib/api/ai-client";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import type { OllamaLoadedModelStatus, OllamaStatus } from "@/types/api";

type AiStatusState =
  | {
      status: "checking";
    }
  | {
      status: "ready" | "no_model" | "offline" | "error";
      data?: OllamaStatus;
      error?: string;
    };

const findLoadedModel = (
  status: OllamaStatus | undefined
): OllamaLoadedModelStatus | undefined => status?.loadedModels[0];

const statusContent = (state: AiStatusState) => {
  if (state.status === "checking") {
    return {
      iconClassName: "bg-indigo-50 text-action",
      title: "Status wird geprüft",
      detail: "Ollama wird abgefragt",
      linkLabel: "AI Status öffnen"
    };
  }

  if (state.status === "ready") {
    const loadedModel = findLoadedModel(state.data);

    return {
      iconClassName: "bg-emerald-50 text-emerald-700",
      title: "Ollama bereit",
      detail: `Modell: ${loadedModel?.name ?? "geladen"}`,
      linkLabel: "Modell wechseln"
    };
  }

  if (state.status === "no_model") {
    const installedCount = state.data?.models.length ?? 0;

    return {
      iconClassName: "bg-amber-50 text-amber-700",
      title: "Kein Modell geladen",
      detail: `0/${installedCount} geladen`,
      linkLabel: "Modell laden"
    };
  }

  if (state.status === "offline") {
    return {
      iconClassName: "bg-red-50 text-red-700",
      title: "Ollama offline",
      detail: "Dienst nicht erreichbar",
      linkLabel: "AI Status öffnen"
    };
  }

  return {
    iconClassName: "bg-slate-100 text-slate-600",
    title: "Status nicht verfügbar",
    detail: state.error ?? "Status konnte nicht gelesen werden",
    linkLabel: "AI Status öffnen"
  };
};

export function DashboardAiStatus() {
  const [state, setState] = useState<AiStatusState>({ status: "checking" });

  useEffect(() => {
    let isMounted = true;

    const refreshStatus = async () => {
      try {
        const payload = await getAiStatus();

        if (!isMounted) {
          return;
        }

        if (!payload.success || !payload.data) {
          setState({
            status: "error",
            error: payload.error?.message
          });
          return;
        }

        if (!payload.data.reachable) {
          setState({ status: "offline", data: payload.data });
          return;
        }

        setState({
          status: payload.data.loadedModels.length > 0 ? "ready" : "no_model",
          data: payload.data
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          error: error instanceof Error ? error.message : undefined
        });
      }
    };

    void refreshStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const content = statusContent(state);

  return (
    <Panel title="KI Status">
      <div className="grid gap-4">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <span
            className={`flex size-8 items-center justify-center rounded-full ${content.iconClassName}`}
          >
            <Icon className="size-4" name="bot" />
          </span>
          <div>
            <p
              className={`text-sm font-semibold ${
                state.status === "ready"
                  ? "text-emerald-700"
                  : state.status === "no_model"
                    ? "text-amber-700"
                    : state.status === "offline"
                      ? "text-red-700"
                      : "text-slate-950"
              }`}
            >
              {content.title}
            </p>
            <p className="mt-1 text-xs text-slate-500">{content.detail}</p>
            <Link
              className="mt-1 block text-xs font-semibold text-action"
              href="/ai"
            >
              {content.linkLabel}
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Icon className="size-4" name="shield" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Lokale Speicherung
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Alle Daten werden lokal gespeichert
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className="h-2 w-[18%] rounded-full bg-action" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            1.2 GB von 10 GB verwendet
          </p>
        </div>
      </div>
    </Panel>
  );
}
