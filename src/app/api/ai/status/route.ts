import { createHttpJsonResponse } from "@/lib/api/http-response";
import { getOllamaStatus } from "@/lib/services/ai/ollama-status-service";

export async function GET(request: Request): Promise<Response> {
  const model = new URL(request.url).searchParams.get("model")?.trim();

  return createHttpJsonResponse(
    await getOllamaStatus({
      ...(model ? { model } : {})
    })
  );
}
