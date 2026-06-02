// Thin Next.js adapter for cover-letter generation. All document safety and
// no-invention rules live in the shared service layer.
import {
  createHttpJsonResponse,
  readJsonRequestBody
} from "@/lib/api/http-response";
import { generateCoverLetter } from "@/lib/services/ai/generate-cover-letter-service";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequestBody(request);

  return createHttpJsonResponse(
    body.success ? await generateCoverLetter(body.data) : body
  );
}
