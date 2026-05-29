import {
  createHttpJsonResponse,
  readJsonRequestBody
} from "@/lib/api/http-response";
import { extractProfile } from "@/lib/services/ai/extract-profile-service";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequestBody(request);

  return createHttpJsonResponse(
    body.success ? await extractProfile(body.data) : body
  );
}
