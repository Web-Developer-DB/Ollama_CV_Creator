export type WorkflowRoute = {
  href: string;
  label: string;
  step?: string;
  title: string;
  dependency: string;
  outcome: string;
};

export type NavigationGroup = {
  label: string;
  items: WorkflowRoute[];
};

export const overviewRoute: WorkflowRoute = {
  href: "/dashboard",
  label: "Dashboard",
  title: "Create application documents",
  dependency: "Project workspace",
  outcome: "Guided next action"
};

export const cvWorkflowSteps: WorkflowRoute[] = [
  {
    href: "/import",
    label: "Candidate",
    step: "1",
    title: "Collect candidate context",
    dependency: "Start here",
    outcome: "Raw experience saved"
  },
  {
    href: "/profile",
    label: "Profile",
    step: "2",
    title: "Review structured profile",
    dependency: "Requires candidate context",
    outcome: "Verified profile facts"
  },
  {
    href: "/documents",
    label: "Write",
    step: "3",
    title: "Write CV and cover letter",
    dependency: "Requires reviewed profile",
    outcome: "Editable documents"
  },
  {
    href: "/templates",
    label: "Design",
    step: "4",
    title: "Choose document design",
    dependency: "Requires document drafts",
    outcome: "Professional preview"
  },
  {
    href: "/export",
    label: "Export",
    step: "5",
    title: "Export application package",
    dependency: "Requires selected design",
    outcome: "PDF and project files"
  }
];

export const tailoringSteps: WorkflowRoute[] = [
  {
    href: "/job",
    label: "Target role",
    step: "T1",
    title: "Add target job",
    dependency: "Optional after profile",
    outcome: "Tailoring context"
  },
  {
    href: "/analysis",
    label: "Tailoring",
    step: "T2",
    title: "Find positioning cues",
    dependency: "Requires target job",
    outcome: "Relevant emphasis"
  }
];

export const jobMatchingSteps = tailoringSteps;

export const workflowSteps = cvWorkflowSteps;

export const systemRoutes: WorkflowRoute[] = [
  {
    href: "/ai",
    label: "AI Status",
    title: "AI Status",
    dependency: "Ollama service",
    outcome: "Model readiness visible"
  }
];

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [overviewRoute]
  },
  {
    label: "Document creation",
    items: cvWorkflowSteps.slice(0, 3)
  },
  {
    label: "Design and export",
    items: cvWorkflowSteps.slice(3)
  },
  {
    label: "Role tailoring",
    items: tailoringSteps
  },
  {
    label: "System",
    items: systemRoutes
  }
];

export const routeItems: WorkflowRoute[] = navigationGroups.flatMap(
  (group) => group.items
);
