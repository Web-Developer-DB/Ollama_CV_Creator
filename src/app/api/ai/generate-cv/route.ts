import {
  createHttpJsonResponse,
  readJsonRequestBody
} from "@/lib/api/http-response";
import { generateCv } from "@/lib/services/ai/generate-cv-service";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequestBody(request);

  return createHttpJsonResponse(body.success ? await generateCv(body.data) : body);
}
