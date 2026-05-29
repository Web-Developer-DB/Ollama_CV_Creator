import {
  createHttpJsonResponse,
  readJsonRequestBody
} from "@/lib/api/http-response";
import { controlOllamaModel } from "@/lib/services/ai/model-control-service";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequestBody(request);

  return createHttpJsonResponse(
    body.success ? await controlOllamaModel(body.data) : body
  );
}
