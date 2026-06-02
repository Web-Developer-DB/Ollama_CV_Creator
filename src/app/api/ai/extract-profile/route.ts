// Thin Next.js adapter for profile extraction. Business logic lives in the
// framework-independent AI service so Electron IPC can reuse the same behavior.
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
