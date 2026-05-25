import { describe, expect, it } from "vitest";
import { sampleCandidateContext } from "./sample-candidate-context";

describe("sample candidate context", () => {
  it("contains a comprehensive demo profile for extraction testing", () => {
    expect(sampleCandidateContext).toContain("Nora Stein");
    expect(sampleCandidateContext).toContain("School education");
    expect(sampleCandidateContext).toContain("College and preparatory education");
    expect(sampleCandidateContext).toContain("Vocational education");
    expect(sampleCandidateContext).toContain("University education");
    expect(sampleCandidateContext).toContain("Continuing education and certifications");
    expect(sampleCandidateContext).toContain("Acme Health GmbH");
    expect(sampleCandidateContext).toContain("Northstar Logistics AG");
    expect(sampleCandidateContext).toContain("Studio Volt GmbH");
    expect(sampleCandidateContext.length).toBeGreaterThan(5500);
  });
});
