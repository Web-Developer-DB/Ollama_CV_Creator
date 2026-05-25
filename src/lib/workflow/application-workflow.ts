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
  title: "Overview",
  dependency: "Project workspace",
  outcome: "Next action visible"
};

export const cvWorkflowSteps: WorkflowRoute[] = [
  {
    href: "/import",
    label: "Import",
    step: "1",
    title: "Import candidate context",
    dependency: "Start here",
    outcome: "Candidate source saved"
  },
  {
    href: "/profile",
    label: "Profile",
    step: "2",
    title: "Extract and review profile",
    dependency: "Requires candidate context",
    outcome: "Editable candidate profile"
  },
  {
    href: "/documents",
    label: "Documents",
    step: "3",
    title: "Generate CV draft",
    dependency: "Requires reviewed profile",
    outcome: "CV draft ready"
  },
  {
    href: "/templates",
    label: "Templates",
    step: "4",
    title: "Choose CV design",
    dependency: "Requires CV draft",
    outcome: "Styled CV preview"
  },
  {
    href: "/export",
    label: "Export",
    step: "5",
    title: "Export CV package",
    dependency: "Requires selected design",
    outcome: "Final files ready"
  }
];

export const jobMatchingSteps: WorkflowRoute[] = [
  {
    href: "/job",
    label: "Job",
    step: "J1",
    title: "Add target job",
    dependency: "Optional after profile",
    outcome: "Role target saved"
  },
  {
    href: "/analysis",
    label: "Analysis",
    step: "J2",
    title: "Analyze match",
    dependency: "Requires target job",
    outcome: "Strengths and gaps visible"
  }
];

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
    label: "CV creation",
    items: cvWorkflowSteps.slice(0, 3)
  },
  {
    label: "Design and export",
    items: cvWorkflowSteps.slice(3)
  },
  {
    label: "Job matching",
    items: jobMatchingSteps
  },
  {
    label: "System",
    items: systemRoutes
  }
];

export const routeItems: WorkflowRoute[] = navigationGroups.flatMap(
  (group) => group.items
);
