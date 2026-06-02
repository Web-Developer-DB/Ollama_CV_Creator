// Thin Next.js adapter for optional job analysis. Keep route code limited to
// request parsing and ApiResponse-to-HTTP mapping.
import {
  createHttpJsonResponse,
  readJsonRequestBody
} from "@/lib/api/http-response";
import { analyzeJob } from "@/lib/services/ai/analyze-job-service";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequestBody(request);

  return createHttpJsonResponse(body.success ? await analyzeJob(body.data) : body);
}
