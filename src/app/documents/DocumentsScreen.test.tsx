import { deleteDB } from "idb";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import { DocumentsScreen } from "./DocumentsScreen";

vi.mock("@/lib/api/ai-client", () => ({
  analyzeJob: vi.fn(),
  generateCoverLetter: vi.fn(),
  generateCv: vi.fn()
}));

const { analyzeJob, generateCoverLetter, generateCv } = vi.mocked(
  await import("@/lib/api/ai-client")
);

const generatedCv = {
  id: "generated-cv",
  title: "Generated CV",
  language: "en" as const,
  summary: "Generated CV summary.",
  sections: [
    {
      id: "section-summary",
      type: "summary" as const,
      title: "Profile",
      items: [
        {
          id: "item-summary",
          body: "Generated CV summary.",
          bullets: []
        }
      ]
    }
  ],
  meta: {
    generatedAt: "2026-05-31T00:00:00.000Z"
  }
};

const generatedCoverLetter = {
  id: "generated-cover-letter",
  language: "en" as const,
  recipient: {
    company: "Target GmbH"
  },
  subject: "Application for Frontend Engineer",
  greeting: "Dear hiring team,",
  opening: "Generated cover letter opening.",
  body: ["Generated cover letter body."],
  closing: "Sincerely,",
  signature: "Ada Lovelace",
  meta: {
    generatedAt: "2026-05-31T00:00:00.000Z"
  }
};

const generatedGeneralCoverLetter = {
  ...generatedCoverLetter,
  id: "generated-general-cover-letter",
  recipient: undefined,
  subject: "General application",
  opening: "General cover letter opening.",
  body: ["General cover letter body."]
};

const generatedAnalysis = {
  requiredSkills: ["React"],
  optionalSkills: [],
  responsibilities: ["Build interfaces"],
  keywords: ["frontend"],
  softSkills: ["Collaboration"],
  strengths: ["React experience"],
  gaps: [],
  recommendations: ["Emphasize accessible React work"]
};

const projectWithDocuments: ApplicationProject = {
  id: "project-1",
  title: "Frontend Engineer at Target GmbH",
  status: "documents_generated",
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
  candidateProfile: {
    personalInfo: {
      fullName: "Ada Lovelace",
      email: "ada@example.com"
    },
    summary: "Frontend engineer focused on accessible React applications.",
    experiences: [
      {
        id: "exp-1",
        company: "Acme GmbH",
        role: "Frontend Engineer",
        responsibilities: ["Built accessible React components"],
        achievements: [],
        technologies: ["React", "TypeScript"]
      }
    ],
    education: [],
    skills: {
      technical: ["React", "TypeScript"],
      soft: ["Collaboration"],
      tools: [],
      languages: ["English"],
      methods: []
    },
    projects: [],
    languages: [],
    certificates: [],
    extractionMeta: {
      language: "en",
      uncertainFields: []
    }
  },
  jobTarget: {
    id: "job-1",
    title: "Frontend Engineer",
    company: "Target GmbH",
    jobDescription: "Build accessible React applications.",
    language: "en",
    tone: "professional"
  },
  generatedDocuments: {
    cv: {
      id: "cv-1",
      title: "Frontend Engineer CV",
      language: "en",
      summary: "Original CV summary.",
      sections: [],
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    },
    coverLetter: {
      id: "cover-letter-1",
      language: "en",
      subject: "Application for Frontend Engineer",
      greeting: "Dear hiring team,",
      opening: "Original cover letter opening.",
      body: ["Original cover letter body."],
      closing: "Sincerely,",
      signature: "Ada Lovelace",
      meta: {
        generatedAt: "2026-05-24T00:00:00.000Z"
      }
    }
  }
};

describe("DocumentsScreen", () => {
  beforeEach(async () => {
    await deleteDB("ollama-cv-creator");
    analyzeJob.mockReset();
    generateCoverLetter.mockReset();
    generateCv.mockReset();
    useProjectStore.setState({
      projects: [projectWithDocuments],
      selectedProjectId: projectWithDocuments.id,
      isLoading: false,
      error: undefined
    });
  });

  it("makes CV text editable", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const cvDraft = screen.getByLabelText("CV draft");
    await user.clear(cvDraft);
    await user.type(cvDraft, "Updated CV draft.");

    expect(cvDraft).toHaveValue("Updated CV draft.");
  });

  it("makes cover letter text editable", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const coverLetterDraft = screen.getByLabelText("Cover letter draft");
    await user.clear(coverLetterDraft);
    await user.type(coverLetterDraft, "Updated cover letter draft.");

    expect(coverLetterDraft).toHaveValue("Updated cover letter draft.");
  });

  it("persists document changes", async () => {
    const user = userEvent.setup();

    render(<DocumentsScreen />);

    const cvDraft = screen.getByLabelText("CV draft");
    await user.clear(cvDraft);
    await user.type(cvDraft, "Persisted CV draft.");

    const coverLetterDraft = screen.getByLabelText("Cover letter draft");
    await user.clear(coverLetterDraft);
    await user.type(coverLetterDraft, "Persisted cover letter draft.");

    await user.click(screen.getByRole("button", { name: "Save documents" }));

    await waitFor(() => {
      const [project] = useProjectStore.getState().projects;

      expect(project.generatedDocuments?.cv?.summary).toBe(
        "Persisted CV draft."
      );
      expect(project.generatedDocuments?.coverLetter?.opening).toBe(
        "Persisted cover letter draft."
      );
    });
  });

  it("generates a general CV from the candidate profile", async () => {
    const user = userEvent.setup();
    generateCv.mockResolvedValue({
      success: true,
      data: generatedCv
    });

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create general CV" }));

    await waitFor(() => {
      expect(useProjectStore.getState().projects[0].generatedDocuments?.cv).toEqual(
        generatedCv
      );
    });
    expect(generateCv).toHaveBeenCalledWith({
      candidateProfile: projectWithDocuments.candidateProfile,
      options: {
        language: "en",
        length: "one_page",
        style: "modern"
      }
    });
    expect(screen.getByLabelText("CV draft")).toHaveValue("Generated CV summary.\n\nGenerated CV summary.");
  });

  it("shows generation API errors next to the document actions", async () => {
    const user = userEvent.setup();
    generateCv.mockResolvedValue({
      success: false,
      error: {
        code: "AI_TIMEOUT",
        message: "Die KI-Anfrage hat zu lange gedauert."
      }
    });

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create general CV" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dokument konnte nicht erstellt werden"
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Die KI-Anfrage hat das Zeitlimit erreicht."
    );
  });

  it("shows a live generation status while creating a CV", async () => {
    const user = userEvent.setup();
    let resolveCv!: (value: Awaited<ReturnType<typeof generateCv>>) => void;
    generateCv.mockReturnValue(
      new Promise((resolve) => {
        resolveCv = resolve;
      })
    );

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create general CV" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "CV-Erstellung läuft"
    );

    resolveCv({
      success: true,
      data: generatedCv
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("generates a tailored CV and creates job analysis when missing", async () => {
    const user = userEvent.setup();
    analyzeJob.mockResolvedValue({
      success: true,
      data: generatedAnalysis
    });
    generateCv.mockResolvedValue({
      success: true,
      data: generatedCv
    });

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create tailored CV" }));

    await waitFor(() => {
      expect(useProjectStore.getState().projects[0].jobAnalysis).toEqual(
        generatedAnalysis
      );
    });
    expect(analyzeJob).toHaveBeenCalledWith({
      jobDescription: "Build accessible React applications.",
      language: "en"
    });
    expect(generateCv).toHaveBeenCalledWith({
      candidateProfile: projectWithDocuments.candidateProfile,
      jobTarget: projectWithDocuments.jobTarget,
      jobAnalysis: generatedAnalysis,
      options: {
        language: "en",
        length: "one_page",
        style: "modern"
      }
    });
  });

  it("generates a general cover letter from the candidate profile", async () => {
    const user = userEvent.setup();
    generateCoverLetter.mockResolvedValue({
      success: true,
      data: generatedGeneralCoverLetter
    });

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create general letter" }));

    await waitFor(() => {
      expect(
        useProjectStore.getState().projects[0].generatedDocuments?.coverLetter
      ).toEqual(generatedGeneralCoverLetter);
    });
    expect(generateCoverLetter).toHaveBeenCalledWith({
      candidateProfile: projectWithDocuments.candidateProfile,
      options: {
        language: "en",
        tone: "professional"
      }
    });
    expect(screen.getByLabelText("Cover letter draft")).toHaveValue(
      "General cover letter opening.\n\nGeneral cover letter body.\n\nSincerely,\n\nAda Lovelace"
    );
  });

  it("generates a tailored cover letter for the saved target role", async () => {
    const user = userEvent.setup();
    analyzeJob.mockResolvedValue({
      success: true,
      data: generatedAnalysis
    });
    generateCoverLetter.mockResolvedValue({
      success: true,
      data: generatedCoverLetter
    });

    render(<DocumentsScreen />);

    await user.click(screen.getByRole("button", { name: "Create tailored letter" }));

    await waitFor(() => {
      expect(
        useProjectStore.getState().projects[0].generatedDocuments?.coverLetter
      ).toEqual(generatedCoverLetter);
    });
    expect(generateCoverLetter).toHaveBeenCalledWith({
      candidateProfile: projectWithDocuments.candidateProfile,
      jobTarget: projectWithDocuments.jobTarget,
      jobAnalysis: generatedAnalysis,
      options: {
        language: "en",
        tone: "professional"
      }
    });
    expect(screen.getByLabelText("Cover letter draft")).toHaveValue(
      "Generated cover letter opening.\n\nGenerated cover letter body.\n\nSincerely,\n\nAda Lovelace"
    );
  });
});
