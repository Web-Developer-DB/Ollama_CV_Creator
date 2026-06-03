import { describe, expect, it } from "vitest";
import type { CandidateProfile } from "@/types/profile";
import { normalizeCandidateProfileStructure } from "./profile-structure";

const createProfile = (
  experiences: CandidateProfile["experiences"]
): CandidateProfile => ({
  personalInfo: {},
  experiences,
  education: [],
  skills: {
    technical: [],
    soft: [],
    tools: [],
    languages: [],
    methods: []
  },
  projects: [],
  languages: [],
  certificates: []
});

describe("normalizeCandidateProfileStructure", () => {
  it("fills missing experience headings from ordered source experience blocks", () => {
    const sourceText = `Professional experience:
2023-2026 Senior Frontend Engineer, Acme Health GmbH, Berlin
- Led frontend delivery.

2021-2023 Frontend Engineer, Northstar Logistics AG, Hamburg and remote
- Built dispatch planning tools.

2018-2021 Frontend Developer and Working Student, Studio Volt GmbH, Hamburg
- Developed responsive websites.

2014-2017 Software Development Trainee, TecStart Solutions GmbH, Berlin
- Completed vocational training while contributing to internal business tools.

Skills:
Technical skills: TypeScript, React`;

    const profile = createProfile([
      {
        id: "exp-1",
        company: "",
        role: "",
        responsibilities: ["Leitung der Frontend-Entwicklung."],
        achievements: []
      },
      {
        id: "exp-2",
        responsibilities: ["Dispatch-Planung gebaut."],
        achievements: []
      },
      {
        id: "exp-3",
        responsibilities: ["Kundenwebsites umgesetzt."],
        achievements: []
      },
      {
        id: "exp-4",
        responsibilities: [
          "Abschluss der Berufsausbildung bei gleichzeitiger Mitwirkung an internen Business-Tools."
        ],
        achievements: []
      }
    ]);

    const normalized = normalizeCandidateProfileStructure(profile, sourceText);

    expect(normalized.experiences).toHaveLength(4);
    expect(normalized.experiences[0]).toMatchObject({
      role: "Senior Frontend Engineer",
      company: "Acme Health GmbH",
      location: "Berlin",
      startDate: "2023",
      endDate: "2026"
    });
    expect(normalized.experiences[3]).toMatchObject({
      role: "Software Development Trainee",
      company: "TecStart Solutions GmbH",
      location: "Berlin",
      startDate: "2014",
      endDate: "2017"
    });
    expect(normalized.experiences[3].responsibilities).toEqual([
      "Abschluss der Berufsausbildung bei gleichzeitiger Mitwirkung an internen Business-Tools."
    ]);
  });

  it("understands company-first experience headings", () => {
    const normalized = normalizeCandidateProfileStructure(
      createProfile([]),
      `Professional experience:
2024-2026 Acme Health GmbH, Senior Frontend Engineer, Berlin
- Led delivery.`
    );

    expect(normalized.experiences[0]).toMatchObject({
      company: "Acme Health GmbH",
      role: "Senior Frontend Engineer",
      location: "Berlin",
      startDate: "2024",
      endDate: "2026"
    });
  });

  it("moves an experience heading out of responsibilities", () => {
    const normalized = normalizeCandidateProfileStructure(
      createProfile([
        {
          id: "exp-1",
          responsibilities: [
            "2021-2023 Frontend Engineer, Northstar Logistics AG, Hamburg and remote",
            "Built dispatch planning tools."
          ],
          achievements: []
        }
      ])
    );

    expect(normalized.experiences[0]).toMatchObject({
      role: "Frontend Engineer",
      company: "Northstar Logistics AG",
      location: "Hamburg and remote",
      startDate: "2021",
      endDate: "2023"
    });
    expect(normalized.experiences[0].responsibilities).toEqual([
      "Built dispatch planning tools."
    ]);
  });

  it("keeps multiple ordered education sections from source text", () => {
    const normalized = normalizeCandidateProfileStructure(
      createProfile([]),
      `School education:
2010-2013 Max-Planck-Gymnasium, Berlin
- Abitur with advanced courses in mathematics and English.

University education:
2017-2021 B.Sc. Medieninformatik, HTW Berlin
- Human Computer Interaction.
- Web Engineering.`
    );

    expect(normalized.education).toHaveLength(2);
    expect(normalized.education[0]).toMatchObject({
      institution: "Max-Planck-Gymnasium",
      location: "Berlin",
      startDate: "2010",
      endDate: "2013",
      details: ["Abitur with advanced courses in mathematics and English."]
    });
    expect(normalized.education[1]).toMatchObject({
      degree: "B.Sc.",
      field: "Medieninformatik",
      institution: "HTW Berlin",
      startDate: "2017",
      endDate: "2021",
      details: ["Human Computer Interaction.", "Web Engineering."]
    });
  });
});
